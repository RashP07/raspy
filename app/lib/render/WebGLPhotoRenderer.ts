import type {
  ExportDimensions,
  ExportOptions,
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
  private onContextLost: (event: Event) => void;
  private onContextRestored: () => void;

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
    };
    this.onContextRestored = () => {
      this.contextLost = false;
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
      if (!this.gl) return;
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
            window.dispatchEvent(
              new CustomEvent("raspy:renderer-status", {
                detail: { status: "error" },
              }),
            );
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
    );
  }

  async export(
    project: ProjectState,
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(0.05);

    const dimensions = this.getExportDimensions(project, options);
    const { width, height } = dimensions.actual;

    onProgress?.(0.15);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportGl = exportCanvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!exportGl) {
      if (!isNeutral(project)) {
        // exportVia2d draws the raw source with no shader; exporting a
        // non-neutral project through it would silently drop every slider.
        throw new Error(
          "Export needs WebGL to apply your adjustments. Close other tabs and try again.",
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

    const program = createProgram(exportGl, FULLSCREEN_VERT, ADJUST_FRAG);
    const uniforms = getUniforms(exportGl, program, Object.keys(this.uniforms));
    const buffer = exportGl.createBuffer();
    const vao = exportGl.createVertexArray();
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
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const bitmap = await createPreviewBitmap(
      project.source.blob,
      this.maxTextureSize,
    );
    const texW = bitmap.width;
    const texH = bitmap.height;
    // Widen the kernel so it covers the same image fraction it does on the
    // preview texture (capped at PREVIEW_LONG_EDGE); otherwise sharpness,
    // definition, and noise reduction render weaker on export than on screen.
    const exportKernel = Math.max(1, Math.max(texW, texH) / PREVIEW_LONG_EDGE);

    const tex = exportGl.createTexture();
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
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    onProgress?.(0.55);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

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
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    let blob: Blob;
    if (options.format === "image/jpeg") {
      // Composite on white for JPEG
      const flat = document.createElement("canvas");
      flat.width = width;
      flat.height = height;
      const ctx = flat.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(exportCanvas, 0, 0);
      blob = await canvasToBlob(flat, options.format, options.quality);
    } else {
      blob = await canvasToBlob(exportCanvas, options.format, options.quality);
    }

    exportGl.deleteTexture(tex);
    exportGl.deleteProgram(program);
    exportGl.deleteBuffer(buffer);
    exportGl.deleteVertexArray(vao);

    onProgress?.(1);
    return blob;
  }

  private async exportVia2d(
    project: ProjectState,
    options: ExportOptions,
    width: number,
    height: number,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    if (options.format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    const bitmap = await createPreviewBitmap(project.source.blob, 1e9);
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
    return canvasToBlob(canvas, options.format, options.quality);
  }

  dispose(): void {
    this.disposed = true;
    this.loadVersion += 1;
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Export encoding failed"));
        else resolve(blob);
      },
      type,
      type === "image/png" ? undefined : quality,
    );
  });
}
