export type AdjustmentKey =
  | "exposure"
  | "brilliance"
  | "highlights"
  | "shadows"
  | "contrast"
  | "brightness"
  | "blackPoint"
  | "saturation"
  | "vibrancy"
  | "warmth"
  | "tint"
  | "sharpness"
  | "definition"
  | "noiseReduction"
  | "vignette";

export interface AdjustmentState {
  exposure: number;
  brilliance: number;
  highlights: number;
  shadows: number;
  contrast: number;
  brightness: number;
  blackPoint: number;
  saturation: number;
  vibrancy: number;
  warmth: number;
  tint: number;
  sharpness: number;
  definition: number;
  noiseReduction: number;
  vignette: number;
}

export type AspectRatio =
  | "free"
  | "original"
  | "1:1"
  | "4:3"
  | "3:4"
  | "4:5"
  | "5:4"
  | "3:2"
  | "2:3"
  | "16:9"
  | "9:16";

export interface CropState {
  bounds: { x: number; y: number; width: number; height: number };
  aspect: AspectRatio;
  rotation: 0 | 90 | 180 | 270;
  straighten: number;
  flipX: boolean;
  flipY: boolean;
}

export interface ProjectSource {
  name: string;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
  preview?: ImageBitmap | HTMLImageElement;
}

export interface ProjectState {
  schemaVersion: 1;
  id: string;
  source: ProjectSource;
  adjustments: AdjustmentState;
  crop: CropState;
  updatedAt: number;
}

export interface ExportOptions {
  format: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  size: "original" | "75-percent" | "50-percent";
}

/**
 * Where a finished export goes. Kept out of ExportOptions because it changes
 * nothing about the pixels — the renderer has no business knowing it.
 */
export type SaveDelivery = "share" | "download";

export interface ExportDimensions {
  requested: { width: number; height: number };
  actual: { width: number; height: number };
  reduced: boolean;
  /** Which ceiling bound the output, so the editor can explain the number. */
  limitedBy: "none" | "dimension" | "memory";
  /** Long-edge ceiling applied, in pixels (the GPU's texture limit, capped). */
  maxDimension: number;
  /** Peak byte budget applied, at 8 bytes per output pixel. */
  memoryCap: number;
}

/**
 * What an export actually produced. Format and size can both differ from what
 * was asked for — the browser may lack a codec, and an encode that fails at
 * full size is retried smaller — so the caller names and describes the file
 * from this, never from the options it passed in.
 */
export interface ExportResult {
  blob: Blob;
  format: ExportOptions["format"];
  width: number;
  height: number;
  /** The size the sheet promised, before any fallback. */
  intended: { width: number; height: number };
  /** True when the retry ladder had to give up pixels to succeed. */
  downscaled: boolean;
}

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PhotoRenderer {
  load(source: ProjectSource): Promise<void>;
  render(
    project: ProjectState,
    options?: {
      compare?: boolean;
      mode?: EditorMode;
      viewTransform?: ViewTransform;
    },
  ): void;
  getExportDimensions(
    project: ProjectState,
    options: ExportOptions,
  ): ExportDimensions;
  export(
    project: ProjectState,
    options: ExportOptions,
    signal: AbortSignal,
    onProgress?: (progress: number) => void,
  ): Promise<ExportResult>;
  dispose(): void;
  readonly supportsAdjustments: boolean;
}

export type EditorMode = "adjust" | "crop";

export interface EditSnapshot {
  adjustments: AdjustmentState;
  crop: CropState;
}

/** Shown both as a toast and inline in the adjust panel — keep them identical. */
export const NO_WEBGL_MESSAGE =
  "This browser can't run adjustments. Crop and save still work.";

/** A non-blocking message shown to the user, with its own title. */
export interface EditorNotice {
  title: string;
  message: string;
}

export interface EditorUiState {
  mode: EditorMode;
  activeAdjustment: AdjustmentKey;
  comparing: boolean;
  exportOpen: boolean;
  hasWebGL: boolean;
  storageWarning: EditorNotice | null;
  busy: string | null;
  rendererStatus: "idle" | "loading" | "ready" | "recovering" | "error";
}

export const ADJUSTMENT_KEYS: AdjustmentKey[] = [
  "exposure",
  "brilliance",
  "highlights",
  "shadows",
  "contrast",
  "brightness",
  "blackPoint",
  "saturation",
  "vibrancy",
  "warmth",
  "tint",
  "sharpness",
  "definition",
  "noiseReduction",
  "vignette",
];

export const ADJUSTMENT_META: Record<
  AdjustmentKey,
  { label: string; min: number; max: number; step: number }
> = {
  exposure: { label: "Exposure", min: -2, max: 2, step: 0.05 },
  brilliance: { label: "Brilliance", min: -100, max: 100, step: 1 },
  highlights: { label: "Highlights", min: -100, max: 100, step: 1 },
  shadows: { label: "Shadows", min: -100, max: 100, step: 1 },
  contrast: { label: "Contrast", min: -100, max: 100, step: 1 },
  brightness: { label: "Brightness", min: -100, max: 100, step: 1 },
  blackPoint: { label: "Black Point", min: -100, max: 100, step: 1 },
  saturation: { label: "Saturation", min: -100, max: 100, step: 1 },
  vibrancy: { label: "Vibrancy", min: -100, max: 100, step: 1 },
  warmth: { label: "Warmth", min: -100, max: 100, step: 1 },
  tint: { label: "Tint", min: -100, max: 100, step: 1 },
  sharpness: { label: "Sharpness", min: 0, max: 100, step: 1 },
  definition: { label: "Definition", min: 0, max: 100, step: 1 },
  noiseReduction: { label: "Noise Reduction", min: 0, max: 100, step: 1 },
  vignette: { label: "Vignette", min: 0, max: 100, step: 1 },
};
