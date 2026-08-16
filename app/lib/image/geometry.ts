import type {
  CropState,
  ExportDimensions,
  ExportOptions,
  ViewTransform,
} from "../editor/types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Mat3 = Float32Array;

export interface RenderGeometry {
  sourceSize: { width: number; height: number };
  cropPixelSize: { width: number; height: number };
  outputSize: { width: number; height: number };
  fittedRect: Rect;
  sourceUvFromOutput: Mat3;
  outputUvFromSource: Mat3;
}

export interface GeometryInput {
  sourceWidth: number;
  sourceHeight: number;
  crop: CropState;
  containerWidth: number;
  containerHeight: number;
  padding?: number;
  mode?: "adjust" | "crop";
  viewTransform?: ViewTransform;
}

const IDENTITY_VIEW: ViewTransform = { zoom: 1, panX: 0, panY: 0 };

export function identityMat3(): Mat3 {
  return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
}

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const out = new Float32Array(9);
  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      out[column * 3 + row] =
        a[0 * 3 + row]! * b[column * 3 + 0]! +
        a[1 * 3 + row]! * b[column * 3 + 1]! +
        a[2 * 3 + row]! * b[column * 3 + 2]!;
    }
  }
  return out;
}

export function translationMat3(tx: number, ty: number): Mat3 {
  return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

export function scaleMat3(sx: number, sy: number): Mat3 {
  return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

export function rotationMat3(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

export function transformPoint(
  matrix: Mat3,
  point: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: matrix[0]! * point.x + matrix[3]! * point.y + matrix[6]!,
    y: matrix[1]! * point.x + matrix[4]! * point.y + matrix[7]!,
  };
}

export function invertAffineMat3(matrix: Mat3): Mat3 {
  const a = matrix[0]!;
  const b = matrix[1]!;
  const c = matrix[3]!;
  const d = matrix[4]!;
  const tx = matrix[6]!;
  const ty = matrix[7]!;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-9) return identityMat3();
  const inv = 1 / determinant;
  return new Float32Array([
    d * inv,
    -b * inv,
    0,
    -c * inv,
    a * inv,
    0,
    (c * ty - d * tx) * inv,
    (b * tx - a * ty) * inv,
    1,
  ]);
}

function apply(matrix: Mat3, operation: Mat3): Mat3 {
  return multiplyMat3(operation, matrix);
}

function inverseRotationMat3(rotation: CropState["rotation"]): Mat3 {
  switch (rotation) {
    case 90:
      // Oriented (x, y) -> source (y, 1 - x)
      return new Float32Array([0, -1, 0, 1, 0, 0, 0, 1, 1]);
    case 180:
      return new Float32Array([-1, 0, 0, 0, -1, 0, 1, 1, 1]);
    case 270:
      // Oriented (x, y) -> source (1 - y, x)
      return new Float32Array([0, 1, 0, -1, 0, 0, 1, 0, 1]);
    default:
      return identityMat3();
  }
}

export function orientedDimensions(
  width: number,
  height: number,
  rotation: CropState["rotation"],
): { width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function cropPixelSize(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropState,
): { width: number; height: number } {
  const baseWidth = sourceWidth * crop.bounds.width;
  const baseHeight = sourceHeight * crop.bounds.height;
  return orientedDimensions(baseWidth, baseHeight, crop.rotation);
}

export function fitRect(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding: number,
  viewTransform: ViewTransform = IDENTITY_VIEW,
): Rect {
  const innerWidth = Math.max(1, containerWidth - padding * 2);
  const innerHeight = Math.max(1, containerHeight - padding * 2);
  const scale = Math.min(
    innerWidth / Math.max(1, contentWidth),
    innerHeight / Math.max(1, contentHeight),
  );
  const zoom = Math.min(5, Math.max(1, viewTransform.zoom));
  const width = Math.max(1, contentWidth * scale * zoom);
  const height = Math.max(1, contentHeight * scale * zoom);
  return {
    x: (containerWidth - width) / 2 + viewTransform.panX,
    y: (containerHeight - height) / 2 + viewTransform.panY,
    width,
    height,
  };
}

function sourceUvMatrix(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropState,
  renderBounds: CropState["bounds"],
  outputSize: { width: number; height: number },
  coverStraighten: boolean,
): Mat3 {
  const baseWidth = sourceWidth * renderBounds.width;
  const baseHeight = sourceHeight * renderBounds.height;
  const oriented = orientedDimensions(baseWidth, baseHeight, crop.rotation);
  const angle = (crop.straighten * Math.PI) / 180;
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const coverScale = coverStraighten
    ? Math.max(
        c + (s * oriented.height) / Math.max(1, oriented.width),
        c + (s * oriented.width) / Math.max(1, oriented.height),
        1,
      )
    : 1;

  let matrix = identityMat3();
  matrix = apply(matrix, translationMat3(-0.5, -0.5));
  matrix = apply(matrix, scaleMat3(outputSize.width, outputSize.height));
  matrix = apply(matrix, rotationMat3(-angle));
  matrix = apply(matrix, scaleMat3(1 / coverScale, 1 / coverScale));
  matrix = apply(
    matrix,
    scaleMat3(
      1 / Math.max(1, oriented.width),
      1 / Math.max(1, oriented.height),
    ),
  );
  matrix = apply(matrix, translationMat3(0.5, 0.5));

  if (crop.flipX) {
    matrix = apply(matrix, scaleMat3(-1, 1));
    matrix = apply(matrix, translationMat3(1, 0));
  }
  if (crop.flipY) {
    matrix = apply(matrix, scaleMat3(1, -1));
    matrix = apply(matrix, translationMat3(0, 1));
  }

  matrix = apply(matrix, inverseRotationMat3(crop.rotation));
  matrix = apply(matrix, scaleMat3(renderBounds.width, renderBounds.height));
  matrix = apply(matrix, translationMat3(renderBounds.x, renderBounds.y));
  return matrix;
}

export function computeRenderGeometry(input: GeometryInput): RenderGeometry {
  const mode = input.mode ?? "adjust";
  const renderBounds =
    mode === "crop" ? { x: 0, y: 0, width: 1, height: 1 } : input.crop.bounds;
  const renderCrop: CropState = { ...input.crop, bounds: renderBounds };
  const orientedOutput = cropPixelSize(
    input.sourceWidth,
    input.sourceHeight,
    renderCrop,
  );
  const straightenRadians = (input.crop.straighten * Math.PI) / 180;
  const cos = Math.abs(Math.cos(straightenRadians));
  const sin = Math.abs(Math.sin(straightenRadians));
  const outputSize =
    mode === "crop"
      ? {
          width: cos * orientedOutput.width + sin * orientedOutput.height,
          height: sin * orientedOutput.width + cos * orientedOutput.height,
        }
      : orientedOutput;
  const sourceUvFromOutput = sourceUvMatrix(
    input.sourceWidth,
    input.sourceHeight,
    input.crop,
    renderBounds,
    outputSize,
    mode !== "crop",
  );
  const view =
    mode === "adjust" ? (input.viewTransform ?? IDENTITY_VIEW) : IDENTITY_VIEW;
  return {
    sourceSize: {
      width: input.sourceWidth,
      height: input.sourceHeight,
    },
    cropPixelSize: cropPixelSize(
      input.sourceWidth,
      input.sourceHeight,
      input.crop,
    ),
    outputSize,
    fittedRect: fitRect(
      input.containerWidth,
      input.containerHeight,
      outputSize.width,
      outputSize.height,
      input.padding ?? (mode === "crop" ? 24 : 16),
      view,
    ),
    sourceUvFromOutput,
    outputUvFromSource: invertAffineMat3(sourceUvFromOutput),
  };
}

/**
 * Remaps a full-output source-UV matrix onto one horizontal band of it.
 *
 * The band renders into a framebuffer only `bandRows` tall, so its own output
 * UV covers [0,1] over the band alone. This composes the mapping back onto the
 * full output — and inverts y while doing it, because `readPixels` returns rows
 * bottom-up. Rendering the band upside down means the rows come back in
 * top-down order with no pass to reverse them, which at export sizes is a
 * whole buffer's worth of copying not done.
 *
 * The result: framebuffer row `j` of the band is output row `top + j`.
 */
export function bandSourceUvMatrix(
  sourceUvFromOutput: Mat3,
  top: number,
  bandRows: number,
  outputHeight: number,
): Mat3 {
  return multiplyMat3(
    sourceUvFromOutput,
    multiplyMat3(
      translationMat3(0, (top + bandRows) / outputHeight),
      scaleMat3(1, -bandRows / outputHeight),
    ),
  );
}

export function requestedExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropState,
  size: ExportOptions["size"],
): { width: number; height: number } {
  const scale = size === "75-percent" ? 0.75 : size === "50-percent" ? 0.5 : 1;
  const pixels = cropPixelSize(sourceWidth, sourceHeight, crop);
  return {
    width: Math.max(1, Math.round(pixels.width * scale)),
    height: Math.max(1, Math.round(pixels.height * scale)),
  };
}

/**
 * Applies the two ceilings an export has to respect, and records which one
 * bound — the editor names the reason rather than telling someone their device
 * "can't", which is true of nothing they can act on.
 */
export function constrainExportDimensions(
  requested: { width: number; height: number },
  maxDimension: number,
  memoryCap = 256 * 1024 * 1024,
): ExportDimensions {
  let width = requested.width;
  let height = requested.height;
  let limitedBy: ExportDimensions["limitedBy"] = "none";

  const longEdge = Math.max(width, height);
  if (longEdge > maxDimension) {
    const scale = maxDimension / longEdge;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    limitedBy = "dimension";
  }
  const estimatedBytes = width * height * 8;
  if (estimatedBytes > memoryCap) {
    const scale = Math.sqrt(memoryCap / estimatedBytes);
    width = Math.max(1, Math.floor(width * scale));
    height = Math.max(1, Math.floor(height * scale));
    // Memory bound last and therefore tighter: it is the ceiling to explain.
    limitedBy = "memory";
  }
  return {
    requested,
    actual: { width, height },
    reduced: width !== requested.width || height !== requested.height,
    limitedBy,
    maxDimension,
    memoryCap,
  };
}
