import type { PhotoRenderer } from "@/app/lib/editor/types";
import { Canvas2DPhotoRenderer } from "./Canvas2DPhotoRenderer";
import { WebGLPhotoRenderer } from "./WebGLPhotoRenderer";

export interface CreateRendererOptions {
  /**
   * Skip WebGL entirely. Set after a context loss the driver never recovered
   * from, where retrying WebGL on a fresh canvas would just fail again.
   */
  preferCanvas2d?: boolean;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  options: CreateRendererOptions = {},
): PhotoRenderer {
  if (options.preferCanvas2d) return new Canvas2DPhotoRenderer(canvas);
  try {
    return new WebGLPhotoRenderer(canvas);
  } catch {
    return new Canvas2DPhotoRenderer(canvas);
  }
}
