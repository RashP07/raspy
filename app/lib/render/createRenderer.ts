import type { PhotoRenderer } from "@/app/lib/editor/types";
import { Canvas2DPhotoRenderer } from "./Canvas2DPhotoRenderer";
import { WebGLPhotoRenderer } from "./WebGLPhotoRenderer";

export function createRenderer(canvas: HTMLCanvasElement): PhotoRenderer {
  try {
    return new WebGLPhotoRenderer(canvas);
  } catch {
    return new Canvas2DPhotoRenderer(canvas);
  }
}
