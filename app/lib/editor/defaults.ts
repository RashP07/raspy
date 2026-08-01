import type {
  AdjustmentState,
  CropState,
  EditSnapshot,
  ProjectState,
} from "./types";

export function createDefaultAdjustments(): AdjustmentState {
  return {
    exposure: 0,
    brilliance: 0,
    highlights: 0,
    shadows: 0,
    contrast: 0,
    brightness: 0,
    blackPoint: 0,
    saturation: 0,
    vibrancy: 0,
    warmth: 0,
    tint: 0,
    sharpness: 0,
    definition: 0,
    noiseReduction: 0,
    vignette: 0,
  };
}

export function createDefaultCrop(): CropState {
  return {
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    aspect: "free",
    rotation: 0,
    straighten: 0,
    flipX: false,
    flipY: false,
  };
}

export function createProjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createProject(input: {
  name: string;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
  preview?: ImageBitmap | HTMLImageElement;
}): ProjectState {
  return {
    schemaVersion: 1,
    id: createProjectId(),
    source: {
      name: input.name,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      blob: input.blob,
      preview: input.preview,
    },
    adjustments: createDefaultAdjustments(),
    crop: createDefaultCrop(),
    updatedAt: Date.now(),
  };
}

export function snapshotFromProject(project: ProjectState): EditSnapshot {
  return {
    adjustments: { ...project.adjustments },
    crop: {
      ...project.crop,
      bounds: { ...project.crop.bounds },
    },
  };
}

export function applySnapshot(
  project: ProjectState,
  snapshot: EditSnapshot,
): ProjectState {
  return {
    ...project,
    adjustments: { ...snapshot.adjustments },
    crop: {
      ...snapshot.crop,
      bounds: { ...snapshot.crop.bounds },
    },
    updatedAt: Date.now(),
  };
}

export function areSnapshotsEqual(a: EditSnapshot, b: EditSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
