import { transformPoint, type RenderGeometry } from "@/app/lib/image/geometry";

export type CanvasImageSourceLike = ImageBitmap | HTMLImageElement;

export function sourceDimensions(source: CanvasImageSourceLike): {
  width: number;
  height: number;
} {
  return {
    width: "naturalWidth" in source ? source.naturalWidth : source.width,
    height: "naturalHeight" in source ? source.naturalHeight : source.height,
  };
}

export function drawSourceWithGeometry(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSourceLike,
  geometry: RenderGeometry,
  pixelScale = 1,
): void {
  const sourceSize = sourceDimensions(source);
  const p0 = transformPoint(geometry.outputUvFromSource, { x: 0, y: 0 });
  const px = transformPoint(geometry.outputUvFromSource, { x: 1, y: 0 });
  const py = transformPoint(geometry.outputUvFromSource, { x: 0, y: 1 });
  const fitted = geometry.fittedRect;
  const toScreen = (point: { x: number; y: number }) => ({
    x: (fitted.x + point.x * fitted.width) * pixelScale,
    y: (fitted.y + point.y * fitted.height) * pixelScale,
  });
  const origin = toScreen(p0);
  const xAxis = toScreen(px);
  const yAxis = toScreen(py);

  ctx.save();
  ctx.beginPath();
  ctx.rect(
    fitted.x * pixelScale,
    fitted.y * pixelScale,
    fitted.width * pixelScale,
    fitted.height * pixelScale,
  );
  ctx.clip();
  ctx.setTransform(
    (xAxis.x - origin.x) / Math.max(1, sourceSize.width),
    (xAxis.y - origin.y) / Math.max(1, sourceSize.width),
    (yAxis.x - origin.x) / Math.max(1, sourceSize.height),
    (yAxis.y - origin.y) / Math.max(1, sourceSize.height),
    origin.x,
    origin.y,
  );
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}
