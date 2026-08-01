import type {
  ExportDimensions,
  ExportOptions,
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
    );
  }

  async export(
    project: ProjectState,
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(0.2);
    const { width, height } = this.getExportDimensions(project, options).actual;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
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
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Export encoding failed"));
          else resolve(blob);
        },
        options.format,
        options.format === "image/png" ? undefined : options.quality,
      );
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.source && "close" in this.source) this.source.close();
    this.source = null;
  }
}
