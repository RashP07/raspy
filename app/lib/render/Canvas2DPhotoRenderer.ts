import type {
  ExportDimensions,
  ExportOptions,
  ExportResult,
  PhotoRenderer,
  ProjectSource,
  ProjectState,
} from "@/app/lib/editor/types";
import { createPreviewBitmap } from "@/app/lib/image/decode";
import {
  computeRenderGeometry,
  constrainExportDimensions,
  requestedExportDimensions,
} from "@/app/lib/image/geometry";
import { drawSourceWithGeometry } from "./canvasDraw";
import { displayScale } from "./displayScale";
import { encodeCanvas } from "./encode";
import { ExportError, isRetryableExportFailure } from "./exportError";
import { exportAttemptLadder, exportMemoryCap } from "./exportLimits";

/**
 * Canvas 2D fallback: crop/orientation/export only. Adjustments are no-ops.
 */
export class Canvas2DPhotoRenderer implements PhotoRenderer {
  readonly supportsAdjustments = false;
  private source: ImageBitmap | HTMLImageElement | null = null;
  private sourceBlob: Blob | null = null;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {}

  async load(source: ProjectSource): Promise<void> {
    if (this.disposed) return;
    this.sourceBlob = source.blob;
    if (this.source && "close" in this.source) {
      this.source.close();
    }
    this.source = source.preview ?? (await createPreviewBitmap(source.blob));
  }

  render(
    project: ProjectState,
    options?: {
      compare?: boolean;
      mode?: "adjust" | "crop";
      viewTransform?: { zoom: number; panX: number; panY: number };
    },
  ): void {
    if (!this.source || this.disposed) return;
    const parent = this.canvas.parentElement;
    const cssW = parent?.clientWidth || this.canvas.clientWidth || 1;
    const cssH = parent?.clientHeight || this.canvas.clientHeight || 1;
    const dpr = displayScale();
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    // Transparent, so the themed .se-viewport background shows through rather
    // than the canvas baking in one palette. Export paths flatten separately.
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const geometry = computeRenderGeometry({
      sourceWidth: project.source.width,
      sourceHeight: project.source.height,
      crop: project.crop,
      containerWidth: cssW,
      containerHeight: cssH,
      mode: options?.mode ?? "adjust",
      viewTransform: options?.viewTransform,
    });
    drawSourceWithGeometry(ctx, this.source, geometry, dpr);
  }

  getExportDimensions(
    project: ProjectState,
    options: ExportOptions,
  ): ExportDimensions {
    return constrainExportDimensions(
      requestedExportDimensions(
        project.source.width,
        project.source.height,
        project.crop,
        options.size,
      ),
      8192,
      exportMemoryCap(),
    );
  }

  /** Same ladder as the WebGL path: a failed encode retries at fewer pixels. */
  async export(
    project: ProjectState,
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<ExportResult> {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const intended = this.getExportDimensions(project, options).actual;
    let lastError: unknown = null;
    for (const size of exportAttemptLadder(intended)) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const encoded = await this.exportAtSize(
          project,
          options,
          size.width,
          size.height,
          signal,
          onProgress,
        );
        return {
          blob: encoded.blob,
          format: encoded.format,
          width: size.width,
          height: size.height,
          intended,
          downscaled: size.width !== intended.width,
        };
      } catch (error) {
        if (signal.aborted || (error as Error)?.name === "AbortError") throw error;
        if (!isRetryableExportFailure(error)) throw error;
        lastError = error;
        console.warn(
          `Export failed at ${size.width}×${size.height}; retrying smaller`,
          error,
        );
      }
    }
    throw lastError instanceof ExportError
      ? lastError
      : new ExportError(
          "unknown",
          lastError instanceof Error ? lastError.message : "Export failed",
          "Saving failed even at a reduced size. Close other tabs and try again, or pick a smaller size.",
          { cause: lastError },
        );
  }

  private async exportAtSize(
    project: ProjectState,
    options: ExportOptions,
    width: number,
    height: number,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ) {
    onProgress?.(0.2);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new ExportError(
        "memory",
        "2D context unavailable",
        "Your browser ran out of memory for an image this size. Close other tabs, or pick a smaller size.",
      );
    }
    if (options.format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    const bitmap = await createPreviewBitmap(
      this.sourceBlob ?? project.source.blob,
      1e9,
    );
    const geometry = computeRenderGeometry({
      sourceWidth: project.source.width,
      sourceHeight: project.source.height,
      crop: project.crop,
      containerWidth: width,
      containerHeight: height,
      padding: 0,
      mode: "adjust",
    });
    drawSourceWithGeometry(ctx, bitmap, geometry);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(1);
    try {
      return await encodeCanvas(canvas, options.format, options.quality);
    } finally {
      // Free the backing store now; a retry is about to ask for another one.
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.source && "close" in this.source) this.source.close();
    this.source = null;
  }
}
