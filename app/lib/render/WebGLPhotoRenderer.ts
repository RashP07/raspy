import type {
  ExportDimensions,
  ExportOptions,
  ExportResult,
  PhotoRenderer,
  ProjectSource,
  ProjectState,
} from "@/app/lib/editor/types";
import { createPreviewBitmap, PREVIEW_LONG_EDGE } from "@/app/lib/image/decode";
import {
  computeRenderGeometry,
  constrainExportDimensions,
  requestedExportDimensions,
} from "@/app/lib/image/geometry";
import { ADJUST_FRAG, FULLSCREEN_VERT } from "./shaders";
import { drawSourceWithGeometry } from "./canvasDraw";
import { displayScale } from "./displayScale";
import { encodeCanvas, type EncodedImage } from "./encode";
import {
  ExportError,
  isRetryableExportFailure,
  type ExportFailureCode,
} from "./exportError";
import {
  canUseWorkerExport,
  exportAttemptLadder,
  exportMemoryCapFor,
  sourceDecodeLongEdge,
} from "./exportLimits";

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "shader compile failed";
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "program link failed";
    gl.deleteProgram(program);
    throw new Error(info);
  }
  return program;
}

/** How long to wait for webglcontextrestored before falling back. */
const RESTORE_TIMEOUT_MS = 8000;

let exportRequestId = 0;

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function closeBitmap(bitmap: ImageBitmap | HTMLImageElement): void {
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
}

/**
 * Rejects the moment the signal fires rather than at the next checkpoint, so
 * cancelling during a decode or an encode is felt immediately. `onLateSettle`
 * releases a value that arrives after we have already given up on it — without
 * it, aborting mid-decode strands an ImageBitmap until GC.
 */
function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  onLateSettle?: (value: T) => void,
): Promise<T> {
  if (signal.aborted) {
    if (onLateSettle) void promise.then(onLateSettle, () => {});
    return Promise.reject(abortError());
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      settled = true;
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        if (settled) onLateSettle?.(value);
        else resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        if (!settled) reject(error);
      },
    );
  });
}

/** GPU objects an export allocates, tracked so they can always be released. */
interface ExportResources {
  program: WebGLProgram | null;
  buffer: WebGLBuffer | null;
  vao: WebGLVertexArrayObject | null;
  tex: WebGLTexture | null;
}

type UniformMap = Record<string, WebGLUniformLocation | null>;

function getUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: string[],
): UniformMap {
  const map: UniformMap = {};
  for (const name of names) {
    map[name] = gl.getUniformLocation(program, name);
  }
  return map;
}

function isNeutral(project: ProjectState): boolean {
  return Object.values(project.adjustments).every((value) => value === 0);
}

export class WebGLPhotoRenderer implements PhotoRenderer {
  readonly supportsAdjustments = true;

  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private uniforms: UniformMap = {};
  private vao: WebGLVertexArrayObject | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private sourceWidth = 0;
  private sourceHeight = 0;
  private maxTextureSize = 4096;
  private disposed = false;
  private contextLost = false;
  private sourceAsset: ProjectSource | null = null;
  private loadVersion = 0;
  private restoreTimer: number | null = null;
  private gaveUp = false;
  private onContextLost: (event: Event) => void;
  private onContextRestored: () => void;

  /**
   * A lost context normally restores within a frame or two. Past this the
   * driver is not coming back — usually the OS reclaimed the GPU — and the
   * editor is better off on the Canvas2D renderer than stuck on a spinner.
   */
  private giveUp(): void {
    if (this.gaveUp) return;
    this.gaveUp = true;
    this.clearRestoreTimer();
    window.dispatchEvent(
      new CustomEvent("raspy:renderer-status", { detail: { status: "error" } }),
    );
    window.dispatchEvent(new Event("raspy:renderer-unrecoverable"));
  }

  private clearRestoreTimer(): void {
    if (this.restoreTimer !== null) {
      window.clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    }
  }

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    this.onContextLost = (event: Event) => {
      event.preventDefault();
      this.contextLost = true;
      window.dispatchEvent(
        new CustomEvent("raspy:renderer-status", {
          detail: { status: "recovering" },
        }),
      );
      this.clearRestoreTimer();
      this.restoreTimer = window.setTimeout(() => {
        if (this.contextLost) this.giveUp();
      }, RESTORE_TIMEOUT_MS);
    };
    this.onContextRestored = () => {
      this.contextLost = false;
      this.clearRestoreTimer();
      window.dispatchEvent(
        new CustomEvent("raspy:renderer-status", {
          detail: { status: "recovering" },
        }),
      );
      this.gl = this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      });
      if (!this.gl) {
        this.giveUp();
        return;
      }
      this.initGpu();
      if (this.sourceAsset) {
        void this.load({ ...this.sourceAsset, preview: undefined })
          .then(() => {
            window.dispatchEvent(
              new CustomEvent("raspy:renderer-status", {
                detail: { status: "ready" },
              }),
            );
            window.dispatchEvent(new Event("raspy:renderer-recovered"));
          })
          .catch(() => {
            // The context came back but the photo would not re-upload, so
            // this renderer is done regardless.
            this.giveUp();
          });
      }
    };
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.initGpu();
  }

  private initGpu() {
    const gl = this.gl;
    if (!gl) return;
    this.program = createProgram(gl, FULLSCREEN_VERT, ADJUST_FRAG);
    this.uniforms = getUniforms(gl, this.program, [
      "u_image",
      "u_texel",
      "u_compare",
      "u_neutral",
      "u_sourceUvFromOutput",
      "u_exposure",
      "u_brilliance",
      "u_highlights",
      "u_shadows",
      "u_contrast",
      "u_brightness",
      "u_blackPoint",
      "u_saturation",
      "u_vibrancy",
      "u_warmth",
      "u_tint",
      "u_sharpness",
      "u_definition",
      "u_noiseReduction",
      "u_vignette",
    ]);

    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    const buffer = gl.createBuffer();
    this.vertexBuffer = buffer;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  async load(source: ProjectSource): Promise<void> {
    if (this.disposed) return;
    const version = ++this.loadVersion;
    this.sourceAsset = source;
    const bitmap = source.preview ?? (await createPreviewBitmap(source.blob));
    if (version !== this.loadVersion || this.disposed) {
      if ("close" in bitmap && typeof bitmap.close === "function")
        bitmap.close();
      return;
    }
    const width = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
    const height =
      "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
    this.sourceWidth = width;
    this.sourceHeight = height;

    const gl = this.gl;
    if (!gl || this.contextLost) {
      if ("close" in bitmap && typeof bitmap.close === "function")
        bitmap.close();
      return;
    }

    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  }

  private resizeCanvas(cssWidth: number, cssHeight: number) {
    const dpr = displayScale();
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  render(
    project: ProjectState,
    options?: {
      compare?: boolean;
      mode?: "adjust" | "crop";
      viewTransform?: { zoom: number; panX: number; panY: number };
    },
  ): void {
    const gl = this.gl;
    if (
      !gl ||
      !this.program ||
      !this.texture ||
      this.contextLost ||
      this.disposed
    ) {
      return;
    }

    const parent = this.canvas.parentElement;
    const cssW = parent?.clientWidth || this.canvas.clientWidth || 1;
    const cssH = parent?.clientHeight || this.canvas.clientHeight || 1;
    this.resizeCanvas(cssW, cssH);
    const dpr = this.canvas.width / Math.max(1, cssW);
    const geometry = computeRenderGeometry({
      sourceWidth: project.source.width,
      sourceHeight: project.source.height,
      crop: project.crop,
      containerWidth: cssW,
      containerHeight: cssH,
      mode: options?.mode ?? "adjust",
      viewTransform: options?.viewTransform,
    });

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // Transparent, so the themed .se-viewport background shows through rather
    // than the canvas baking in one palette. Export paths flatten separately.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const viewportX = Math.round(geometry.fittedRect.x * dpr);
    const viewportY = Math.round(
      this.canvas.height -
        (geometry.fittedRect.y + geometry.fittedRect.height) * dpr,
    );
    gl.viewport(
      viewportX,
      viewportY,
      Math.max(1, Math.round(geometry.fittedRect.width * dpr)),
      Math.max(1, Math.round(geometry.fittedRect.height * dpr)),
    );

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.u_image, 0);
    gl.uniform2f(
      this.uniforms.u_texel,
      1 / Math.max(1, this.sourceWidth),
      1 / Math.max(1, this.sourceHeight),
    );

    const adj = project.adjustments;
    const compare = options?.compare ? 1 : 0;

    gl.uniform1f(this.uniforms.u_compare, compare);
    gl.uniform1f(this.uniforms.u_neutral, isNeutral(project) ? 1 : 0);
    gl.uniformMatrix3fv(
      this.uniforms.u_sourceUvFromOutput,
      false,
      geometry.sourceUvFromOutput,
    );

    gl.uniform1f(this.uniforms.u_exposure, adj.exposure);
    gl.uniform1f(this.uniforms.u_brilliance, adj.brilliance);
    gl.uniform1f(this.uniforms.u_highlights, adj.highlights);
    gl.uniform1f(this.uniforms.u_shadows, adj.shadows);
    gl.uniform1f(this.uniforms.u_contrast, adj.contrast);
    gl.uniform1f(this.uniforms.u_brightness, adj.brightness);
    gl.uniform1f(this.uniforms.u_blackPoint, adj.blackPoint);
    gl.uniform1f(this.uniforms.u_saturation, adj.saturation);
    gl.uniform1f(this.uniforms.u_vibrancy, adj.vibrancy);
    gl.uniform1f(this.uniforms.u_warmth, adj.warmth);
    gl.uniform1f(this.uniforms.u_tint, adj.tint);
    gl.uniform1f(this.uniforms.u_sharpness, adj.sharpness);
    gl.uniform1f(this.uniforms.u_definition, adj.definition);
    gl.uniform1f(this.uniforms.u_noiseReduction, adj.noiseReduction);
    gl.uniform1f(this.uniforms.u_vignette, adj.vignette);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  getExportDimensions(
    project: ProjectState,
    options: ExportOptions,
  ): ExportDimensions {
    const requested = requestedExportDimensions(
      project.source.width,
      project.source.height,
      project.crop,
      options.size,
    );
    return constrainExportDimensions(
      requested,
      Math.min(this.maxTextureSize, 8192),
      exportMemoryCapFor(options.format),
    );
  }

  /**
   * Walks down {@link exportAttemptLadder} until one size encodes.
   *
   * Every ceiling we can compute up front is already applied by
   * `getExportDimensions`, so reaching a retry means the device refused a size
   * it had no way to warn us about — the Android failure mode, where a canvas
   * allocates fine and then encodes to `null`. Half the pixels is a far better
   * answer than the error toast that used to be the only one.
   */
  async export(
    project: ProjectState,
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<ExportResult> {
    if (signal.aborted) throw abortError();

    const dimensions = this.getExportDimensions(project, options);
    const ladder = exportAttemptLadder(dimensions.actual);
    const report = monotonicProgress(onProgress);

    let lastError: unknown = null;
    for (const size of ladder) {
      if (signal.aborted) throw abortError();
      try {
        const encoded = await this.exportAtSize(
          project,
          options,
          size.width,
          size.height,
          signal,
          report,
        );
        return {
          blob: encoded.blob,
          format: encoded.format,
          width: size.width,
          height: size.height,
          intended: dimensions.actual,
          downscaled: size.width !== dimensions.actual.width,
        };
      } catch (error) {
        if (signal.aborted || (error as Error)?.name === "AbortError") throw error;
        if (!isRetryableExportFailure(error)) throw error;
        lastError = error;
        console.warn(
          `Export failed at ${size.width}×${size.height}; retrying smaller`,
          error,
        );
        // Let the discarded canvas and drawing buffer actually go before the
        // next attempt asks for a new one — retrying into the same pressure
        // just fails again.
        await releaseMemory();
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
    onProgress: (progress: number) => void,
  ): Promise<EncodedImage> {
    onProgress(0.05);

    // Preferred path: draw and encode in a worker so a large export does not
    // block the UI thread. Tried before allocating anything here, so the
    // common case never builds a main-thread context it will not use.
    if (canUseWorkerExport()) {
      try {
        return await this.exportViaWorker(
          project,
          options,
          width,
          height,
          signal,
          onProgress,
        );
      } catch (error) {
        if (signal.aborted || (error as Error)?.name === "AbortError")
          throw error;
        if (error instanceof ExportError && error.code === "encode") {
          // The worker got as far as encoding and the encoder said no. The
          // main thread would run the identical code path to the identical
          // answer; hand it up so the ladder drops a size instead.
          throw error;
        }
        if (!isRetryableExportFailure(error)) {
          // A terminal failure — the file would not decode, the format has no
          // encoder — is the same answer on either thread. Retrying it here
          // only replaces a true message with a misleading one.
          throw error;
        }
        // Anything else means the worker path is unavailable on this browser
        // — no OffscreenCanvas WebGL2, a blocked worker URL — and the
        // main-thread path below still works. It is worth a line either way:
        // when the main thread then fails too, this is the first half of why.
        console.warn("Worker export unavailable; falling back", error);
      }
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportGl = exportCanvas.getContext("webgl2", {
      // JPEG cannot carry alpha, so it renders straight into an opaque buffer
      // and composites over white on the GPU. The alternative — a second
      // full-resolution 2D canvas to flatten onto — cost another 4 bytes per
      // pixel at exactly the moment memory was tightest.
      alpha: options.format !== "image/jpeg",
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!exportGl) {
      if (!isNeutral(project)) {
        // exportVia2d draws the raw source with no shader; exporting a
        // non-neutral project through it would silently drop every slider.
        // Retryable: a context refused at this size may well be granted at
        // half the pixels.
        throw new ExportError(
          "webgl",
          "WebGL2 context unavailable for export",
          "Your adjustments need graphics support that isn't available right now. Close other tabs and try again.",
        );
      }
      return this.exportVia2d(
        project,
        options,
        width,
        height,
        signal,
        onProgress,
      );
    }

    // renderExport records what it allocates in `held` so this finally can
    // release it on every exit path — an abort mid-export used to skip the
    // deletes entirely and strand them on the GPU.
    const held: ExportResources = {
      program: null,
      buffer: null,
      vao: null,
      tex: null,
    };
    try {
      return await this.renderExport(
        project,
        options,
        exportCanvas,
        exportGl,
        width,
        height,
        signal,
        onProgress,
        held,
      );
    } finally {
      if (held.tex) exportGl.deleteTexture(held.tex);
      if (held.program) exportGl.deleteProgram(held.program);
      if (held.buffer) exportGl.deleteBuffer(held.buffer);
      if (held.vao) exportGl.deleteVertexArray(held.vao);
      // Drops the drawing buffer now rather than waiting for the canvas to be
      // collected, which matters at export resolutions.
      exportGl.getExtension("WEBGL_lose_context")?.loseContext();
      exportCanvas.width = 0;
      exportCanvas.height = 0;
    }
  }

  private async renderExport(
    project: ProjectState,
    options: ExportOptions,
    exportCanvas: HTMLCanvasElement,
    exportGl: WebGL2RenderingContext,
    width: number,
    height: number,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
    held: ExportResources,
  ): Promise<EncodedImage> {
    const program = createProgram(exportGl, FULLSCREEN_VERT, ADJUST_FRAG);
    held.program = program;
    const uniforms = getUniforms(exportGl, program, Object.keys(this.uniforms));
    const buffer = exportGl.createBuffer();
    held.buffer = buffer;
    const vao = exportGl.createVertexArray();
    held.vao = vao;
    exportGl.bindVertexArray(vao);
    exportGl.bindBuffer(exportGl.ARRAY_BUFFER, buffer);
    exportGl.bufferData(
      exportGl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      exportGl.STATIC_DRAW,
    );
    exportGl.enableVertexAttribArray(0);
    exportGl.vertexAttribPointer(0, 2, exportGl.FLOAT, false, 0, 0);

    onProgress?.(0.3);
    if (signal.aborted) throw abortError();

    const bitmap = await abortable(
      this.decodeForExport(project, { width, height }),
      signal,
      closeBitmap,
    );
    const texW = bitmap.width;
    const texH = bitmap.height;
    // Widen the kernel so it covers the same image fraction it does on the
    // preview texture (capped at PREVIEW_LONG_EDGE); otherwise sharpness,
    // definition, and noise reduction render weaker on export than on screen.
    const exportKernel = Math.max(1, Math.max(texW, texH) / PREVIEW_LONG_EDGE);

    const tex = exportGl.createTexture();
    held.tex = tex;
    exportGl.bindTexture(exportGl.TEXTURE_2D, tex);
    exportGl.pixelStorei(exportGl.UNPACK_FLIP_Y_WEBGL, 0);
    exportGl.texParameteri(
      exportGl.TEXTURE_2D,
      exportGl.TEXTURE_WRAP_S,
      exportGl.CLAMP_TO_EDGE,
    );
    exportGl.texParameteri(
      exportGl.TEXTURE_2D,
      exportGl.TEXTURE_WRAP_T,
      exportGl.CLAMP_TO_EDGE,
    );
    exportGl.texParameteri(
      exportGl.TEXTURE_2D,
      exportGl.TEXTURE_MIN_FILTER,
      exportGl.LINEAR,
    );
    exportGl.texParameteri(
      exportGl.TEXTURE_2D,
      exportGl.TEXTURE_MAG_FILTER,
      exportGl.LINEAR,
    );
    exportGl.texImage2D(
      exportGl.TEXTURE_2D,
      0,
      exportGl.RGBA,
      exportGl.RGBA,
      exportGl.UNSIGNED_BYTE,
      bitmap,
    );
    closeBitmap(bitmap);

    onProgress?.(0.55);
    if (signal.aborted) throw abortError();

    const adj = project.adjustments;
    const geometry = computeRenderGeometry({
      sourceWidth: project.source.width,
      sourceHeight: project.source.height,
      crop: project.crop,
      containerWidth: width,
      containerHeight: height,
      padding: 0,
      mode: "adjust",
    });
    exportGl.viewport(0, 0, width, height);
    if (options.format === "image/jpeg") {
      // Source-over white, in one pass: the same result the flattening canvas
      // produced, for none of the memory.
      exportGl.clearColor(1, 1, 1, 1);
      exportGl.clear(exportGl.COLOR_BUFFER_BIT);
      exportGl.enable(exportGl.BLEND);
      exportGl.blendFunc(exportGl.SRC_ALPHA, exportGl.ONE_MINUS_SRC_ALPHA);
    }
    exportGl.useProgram(program);
    exportGl.activeTexture(exportGl.TEXTURE0);
    exportGl.bindTexture(exportGl.TEXTURE_2D, tex);
    exportGl.uniform1i(uniforms.u_image, 0);
    exportGl.uniform2f(
      uniforms.u_texel,
      exportKernel / Math.max(1, texW),
      exportKernel / Math.max(1, texH),
    );
    exportGl.uniform1f(uniforms.u_compare, 0);
    exportGl.uniform1f(uniforms.u_neutral, isNeutral(project) ? 1 : 0);
    exportGl.uniformMatrix3fv(
      uniforms.u_sourceUvFromOutput,
      false,
      geometry.sourceUvFromOutput,
    );
    exportGl.uniform1f(uniforms.u_exposure, adj.exposure);
    exportGl.uniform1f(uniforms.u_brilliance, adj.brilliance);
    exportGl.uniform1f(uniforms.u_highlights, adj.highlights);
    exportGl.uniform1f(uniforms.u_shadows, adj.shadows);
    exportGl.uniform1f(uniforms.u_contrast, adj.contrast);
    exportGl.uniform1f(uniforms.u_brightness, adj.brightness);
    exportGl.uniform1f(uniforms.u_blackPoint, adj.blackPoint);
    exportGl.uniform1f(uniforms.u_saturation, adj.saturation);
    exportGl.uniform1f(uniforms.u_vibrancy, adj.vibrancy);
    exportGl.uniform1f(uniforms.u_warmth, adj.warmth);
    exportGl.uniform1f(uniforms.u_tint, adj.tint);
    exportGl.uniform1f(uniforms.u_sharpness, adj.sharpness);
    exportGl.uniform1f(uniforms.u_definition, adj.definition);
    exportGl.uniform1f(uniforms.u_noiseReduction, adj.noiseReduction);
    exportGl.uniform1f(uniforms.u_vignette, adj.vignette);

    exportGl.bindVertexArray(vao);
    exportGl.drawArrays(exportGl.TRIANGLE_STRIP, 0, 4);

    onProgress?.(0.8);
    if (signal.aborted) throw abortError();

    const encoded = await abortable(
      encodeCanvas(exportCanvas, options.format, options.quality),
      signal,
    );

    onProgress(1);
    return encoded;
  }

  /**
   * Re-decodes the original file for an export.
   *
   * The sniffed mime type goes along for the ride: a photo picked from a
   * library often arrives as a Blob with no type, and without it a HEIC never
   * reaches the libheif fallback here even though import used it happily.
   *
   * A failure becomes an ExportError so the toast can say the photo would not
   * re-open. Left as a bare Error it surfaced as the ladder's final "even at a
   * reduced size" message, which sent people to close tabs over a decode that
   * had nothing to do with memory.
   */
  private async decodeForExport(
    project: ProjectState,
    output: { width: number; height: number },
  ): Promise<ImageBitmap | HTMLImageElement> {
    try {
      return await createPreviewBitmap(
        project.source.blob,
        Math.min(
          this.maxTextureSize,
          sourceDecodeLongEdge(output, project.crop),
        ),
        project.source.mimeType,
        { width: project.source.width, height: project.source.height },
      );
    } catch (error) {
      throw new ExportError(
        "decode",
        error instanceof Error ? error.message : "Source decode failed",
        "This photo couldn't be re-opened to save it. Open it again from your library and try once more.",
        { cause: error },
      );
    }
  }

  /**
   * Decode stays here because it owns the libheif fallback; the bitmap is then
   * transferred to the worker, which does the GPU draw and the encode.
   */
  private async exportViaWorker(
    project: ProjectState,
    options: ExportOptions,
    width: number,
    height: number,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
  ): Promise<EncodedImage> {
    const bitmap = await abortable(
      this.decodeForExport(project, { width, height }),
      signal,
      closeBitmap,
    );
    onProgress(0.3);

    const worker = new Worker(
      new URL("../../workers/export.worker.ts", import.meta.url),
      { type: "module", name: "raspy-export" },
    );
    const id = ++exportRequestId;

    try {
      const encoded = await new Promise<EncodedImage>((resolve, reject) => {
        const onAbort = () => reject(abortError());
        signal.addEventListener("abort", onAbort, { once: true });

        const settle = (fn: () => void) => {
          signal.removeEventListener("abort", onAbort);
          fn();
        };

        worker.onmessage = (event: MessageEvent) => {
          const data = event.data as {
            id: number;
            type: "progress" | "done" | "error";
            value?: number;
            blob?: Blob;
            format?: EncodedImage["format"];
            code?: ExportFailureCode;
            userMessage?: string;
            message?: string;
          };
          if (data.id !== id) return;
          if (data.type === "progress") {
            onProgress(data.value ?? 0);
          } else if (data.type === "done" && data.blob) {
            const blob = data.blob;
            settle(() =>
              resolve({ blob, format: data.format ?? options.format }),
            );
          } else {
            // A worker failure crosses as plain data; rebuild the typed error
            // so the ladder can still tell a bad encode from a dead worker.
            settle(() =>
              reject(
                data.code
                  ? new ExportError(
                      data.code,
                      data.message ?? "Export failed",
                      data.userMessage ??
                        "This size was too large for your browser to encode. Try a smaller size.",
                    )
                  : new Error(data.message ?? "Export failed"),
              ),
            );
          }
        };
        worker.onerror = () =>
          settle(() => reject(new Error("Export worker failed")));

        worker.postMessage(
          {
            id,
            bitmap,
            width,
            height,
            sourceWidth: project.source.width,
            sourceHeight: project.source.height,
            crop: project.crop,
            adjustments: project.adjustments,
            neutral: isNeutral(project),
            format: options.format,
            quality: options.quality,
          },
          [bitmap as unknown as Transferable],
        );
      });
      // Only a finished export is 100%. Reporting it in the `finally` used to
      // pin the bar at full while a retry was still running.
      onProgress(1);
      return encoded;
    } finally {
      // Terminating is the cleanup: it takes the OffscreenCanvas, its GL
      // context, and any in-flight encode with it, which is what makes abort
      // immediate rather than cooperative.
      worker.terminate();
    }
  }

  private async exportVia2d(
    project: ProjectState,
    options: ExportOptions,
    width: number,
    height: number,
    signal: AbortSignal,
    onProgress: (progress: number) => void,
  ): Promise<EncodedImage> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw contextUnavailable();
    if (options.format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    const bitmap = await createPreviewBitmap(
      project.source.blob,
      1e9,
      project.source.mimeType,
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
    if (signal.aborted) throw abortError();
    onProgress(1);
    return encodeCanvas(canvas, options.format, options.quality);
  }

  dispose(): void {
    this.disposed = true;
    this.loadVersion += 1;
    this.clearRestoreTimer();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.onContextRestored,
    );
    const gl = this.gl;
    if (gl) {
      if (this.texture) gl.deleteTexture(this.texture);
      if (this.program) gl.deleteProgram(this.program);
      if (this.vao) gl.deleteVertexArray(this.vao);
      if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    }
    this.gl = null;
    this.texture = null;
    this.program = null;
    this.vao = null;
    this.vertexBuffer = null;
  }
}

function contextUnavailable(): ExportError {
  return new ExportError(
    "memory",
    "2D context unavailable",
    "Your browser ran out of memory for an image this size. Close other tabs, or pick a smaller size.",
  );
}

/**
 * Progress never runs backwards, even though a retry genuinely restarts the
 * work — a bar that resets reads as a hang, and the person watching it cannot
 * act on the difference anyway.
 */
function monotonicProgress(
  onProgress?: (progress: number) => void,
): (progress: number) => void {
  let high = 0;
  return (value) => {
    if (value <= high) return;
    high = value;
    onProgress?.(value);
  };
}

/**
 * Yields long enough for a discarded canvas and its drawing buffer to be
 * reclaimed before the next attempt allocates. Two frames, because the compositor
 * holds the last one it saw.
 */
function releaseMemory(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(resolve, 50);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
