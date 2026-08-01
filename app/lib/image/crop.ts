import type { AspectRatio, CropState } from "../editor/types";

export const MIN_CROP_SIZE = 0.05;

export function aspectValue(
  aspect: AspectRatio,
  sourceWidth: number,
  sourceHeight: number,
  rotation: CropState["rotation"] = 0,
): number | null {
  switch (aspect) {
    case "free":
      return null;
    case "original":
      return rotation === 90 || rotation === 270
        ? sourceHeight / sourceWidth
        : sourceWidth / sourceHeight;
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    case "3:2":
      return 3 / 2;
    case "2:3":
      return 2 / 3;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
  }
}

export function rotateAspect(aspect: AspectRatio): AspectRatio {
  switch (aspect) {
    case "4:3":
      return "3:4";
    case "3:4":
      return "4:3";
    case "3:2":
      return "2:3";
    case "2:3":
      return "3:2";
    case "16:9":
      return "9:16";
    case "9:16":
      return "16:9";
    default:
      return aspect;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeBounds(
  bounds: CropState["bounds"],
): CropState["bounds"] {
  let { x, y, width, height } = bounds;
  width = clamp(width, MIN_CROP_SIZE, 1);
  height = clamp(height, MIN_CROP_SIZE, 1);
  x = clamp(x, 0, 1 - width);
  y = clamp(y, 0, 1 - height);
  return { x, y, width, height };
}

export function fitAspectBounds(
  aspect: number,
  sourceWidth: number,
  sourceHeight: number,
  rotation: CropState["rotation"],
  existing?: CropState["bounds"],
): CropState["bounds"] {
  const centerX = existing ? existing.x + existing.width / 2 : 0.5;
  const centerY = existing ? existing.y + existing.height / 2 : 0.5;

  const normalizedAspect =
    rotation === 90 || rotation === 270
      ? sourceHeight / Math.max(1, aspect * sourceWidth)
      : (aspect * sourceHeight) / Math.max(1, sourceWidth);

  let width = existing?.width ?? 1;
  let height = width / normalizedAspect;
  if (height > 1) {
    height = 1;
    width = height * normalizedAspect;
  }
  if (width > 1) {
    width = 1;
    height = width / normalizedAspect;
  }

  return normalizeBounds({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
}

export function rotatedDimensions(
  width: number,
  height: number,
  rotation: CropState["rotation"],
): { width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function outputCropDimensions(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropState,
  scale = 1,
): { width: number; height: number } {
  const baseWidth = sourceWidth * crop.bounds.width;
  const baseHeight = sourceHeight * crop.bounds.height;
  const rotated = rotatedDimensions(baseWidth, baseHeight, crop.rotation);
  return {
    width: Math.max(1, Math.round(rotated.width * scale)),
    height: Math.max(1, Math.round(rotated.height * scale)),
  };
}

export function clampStraighten(value: number): number {
  return clamp(value, -45, 45);
}

export function nextRotation(
  current: CropState["rotation"],
): CropState["rotation"] {
  return ((current + 90) % 360) as CropState["rotation"];
}
