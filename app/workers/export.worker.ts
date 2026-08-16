/**
 * Renders and encodes an export off the main thread.
 *
 * The decode stays on the main thread — it owns the libheif fallback — and the
 * resulting ImageBitmap is transferred in. What moves here is the GPU draw and
 * the encode, which is where a large export spends its time and where the jank
 * was visible.
 */

import { ADJUST_FRAG, FULLSCREEN_VERT } from "../lib/render/shaders";
import { computeRenderGeometry } from "../lib/image/geometry";
import { encodeCanvas, type EncodedImage } from "../lib/render/encode";
import { ExportError } from "../lib/render/exportError";
import type {
  AdjustmentState,
  CropState,
  ExportOptions,
} from "../lib/editor/types";

const PREVIEW_LONG_EDGE = 2048;

interface ExportRequest {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  crop: CropState;
  adjustments: AdjustmentState;
  neutral: boolean;
  format: ExportOptions["format"];
  quality: number;
}

const UNIFORM_NAMES = [
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
] as const;

function compile(
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

function link(gl: WebGL2RenderingContext): WebGLProgram {
  const vert = compile(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT);
  const frag = compile(gl, gl.FRAGMENT_SHADER, ADJUST_FRAG);
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

async function renderExport(request: ExportRequest): Promise<EncodedImage> {
  const { width, height, bitmap } = request;
  const canvas = new OffscreenCanvas(width, height);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL2 unavailable in worker");

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let tex: WebGLTexture | null = null;
  try {
    program = link(gl);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of UNIFORM_NAMES) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    buffer = gl.createBuffer();
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texW = bitmap.width;
    const texH = bitmap.height;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    bitmap.close();

    // Same kernel widening as the main-thread path: the preview is capped at
    // PREVIEW_LONG_EDGE, so a texel-sized kernel covers a smaller fraction of
    // a full-resolution export unless it is scaled to match.
    const exportKernel = Math.max(1, Math.max(texW, texH) / PREVIEW_LONG_EDGE);

    const geometry = computeRenderGeometry({
      sourceWidth: request.sourceWidth,
      sourceHeight: request.sourceHeight,
      crop: request.crop,
      containerWidth: width,
      containerHeight: height,
      padding: 0,
      mode: "adjust",
    });

    const adj = request.adjustments;
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uniforms.u_image, 0);
    gl.uniform2f(
      uniforms.u_texel,
      exportKernel / Math.max(1, texW),
      exportKernel / Math.max(1, texH),
    );
    gl.uniform1f(uniforms.u_compare, 0);
    gl.uniform1f(uniforms.u_neutral, request.neutral ? 1 : 0);
    gl.uniformMatrix3fv(
      uniforms.u_sourceUvFromOutput,
      false,
      geometry.sourceUvFromOutput,
    );
    gl.uniform1f(uniforms.u_exposure, adj.exposure);
    gl.uniform1f(uniforms.u_brilliance, adj.brilliance);
    gl.uniform1f(uniforms.u_highlights, adj.highlights);
    gl.uniform1f(uniforms.u_shadows, adj.shadows);
    gl.uniform1f(uniforms.u_contrast, adj.contrast);
    gl.uniform1f(uniforms.u_brightness, adj.brightness);
    gl.uniform1f(uniforms.u_blackPoint, adj.blackPoint);
    gl.uniform1f(uniforms.u_saturation, adj.saturation);
    gl.uniform1f(uniforms.u_vibrancy, adj.vibrancy);
    gl.uniform1f(uniforms.u_warmth, adj.warmth);
    gl.uniform1f(uniforms.u_tint, adj.tint);
    gl.uniform1f(uniforms.u_sharpness, adj.sharpness);
    gl.uniform1f(uniforms.u_definition, adj.definition);
    gl.uniform1f(uniforms.u_noiseReduction, adj.noiseReduction);
    gl.uniform1f(uniforms.u_vignette, adj.vignette);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    self.postMessage({ id: request.id, type: "progress", value: 0.8 });

    if (request.format === "image/jpeg") {
      // Alpha would encode as black, so flatten onto white first.
      const flat = new OffscreenCanvas(width, height);
      const ctx = flat.getContext("2d");
      if (!ctx) {
        throw new ExportError(
          "memory",
          "2D context unavailable in worker",
          "Your browser ran out of memory for an image this size. Close other tabs, or pick a smaller size.",
        );
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(canvas, 0, 0);
      return await encodeCanvas(flat, request.format, request.quality);
    }

    return await encodeCanvas(canvas, request.format, request.quality);
  } finally {
    if (tex) gl.deleteTexture(tex);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    if (vao) gl.deleteVertexArray(vao);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

self.onmessage = (event: MessageEvent<ExportRequest>) => {
  const request = event.data;
  void (async () => {
    try {
      self.postMessage({ id: request.id, type: "progress", value: 0.4 });
      const { blob, format } = await renderExport(request);
      self.postMessage({ id: request.id, type: "done", blob, format });
    } catch (error) {
      // The bitmap was transferred in; release it if the draw never consumed it.
      try {
        request.bitmap.close();
      } catch {
        // Already closed.
      }
      // An Error does not survive structured cloning with its subclass intact,
      // so the parts the main thread needs travel as plain fields.
      self.postMessage({
        id: request.id,
        type: "error",
        message: error instanceof Error ? error.message : "Export failed",
        code: error instanceof ExportError ? error.code : undefined,
        userMessage:
          error instanceof ExportError ? error.userMessage : undefined,
      });
    }
  })();
};
