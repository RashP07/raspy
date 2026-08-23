import {
  applySnapshot,
  createDefaultAdjustments,
  createDefaultCrop,
  snapshotFromProject,
  areSnapshotsEqual,
} from "./defaults";
import type {
  EditorNotice,
  AdjustmentKey,
  CropState,
  EditSnapshot,
  EditorMode,
  EditorUiState,
  ProjectState,
} from "./types";

export const HISTORY_LIMIT = 50;

export type HistoryCoalesceKey =
  `adjust:${AdjustmentKey}` | "crop-gesture" | null;

export interface EditorState {
  project: ProjectState | null;
  past: EditSnapshot[];
  future: EditSnapshot[];
  coalesceKey: HistoryCoalesceKey;
  ui: EditorUiState;
}

export type EditorAction =
  | { type: "LOAD_PROJECT"; project: ProjectState }
  | { type: "CLEAR_PROJECT" }
  | { type: "SET_MODE"; mode: EditorMode }
  | { type: "SET_ACTIVE_ADJUSTMENT"; key: AdjustmentKey }
  | { type: "SET_COMPARING"; comparing: boolean }
  | { type: "SET_EXPORT_OPEN"; open: boolean }
  | { type: "SET_HAS_WEBGL"; hasWebGL: boolean }
  | { type: "SET_STORAGE_WARNING"; warning: EditorNotice | null }
  | { type: "SET_BUSY"; busy: string | null }
  | {
      type: "SET_RENDERER_STATUS";
      status: EditorUiState["rendererStatus"];
    }
  | {
      type: "SET_ADJUSTMENT";
      key: AdjustmentKey;
      value: number;
      coalesce?: boolean;
    }
  | { type: "RESET_ADJUSTMENT"; key: AdjustmentKey }
  | { type: "RESET_ALL_ADJUSTMENTS" }
  | { type: "SET_CROP"; crop: Partial<CropState>; coalesce?: boolean }
  | { type: "RESET_CROP" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "COMMIT_HISTORY" };

export function createInitialEditorState(): EditorState {
  return {
    project: null,
    past: [],
    future: [],
    coalesceKey: null,
    ui: {
      mode: "adjust",
      activeAdjustment: "exposure",
      comparing: false,
      exportOpen: false,
      hasWebGL: true,
      storageWarning: null,
      busy: null,
      rendererStatus: "idle",
    },
  };
}

function pushHistory(
  state: EditorState,
  nextProject: ProjectState,
): EditorState {
  if (!state.project) {
    return { ...state, project: nextProject, past: [], future: [] };
  }
  const previous = snapshotFromProject(state.project);
  const next = snapshotFromProject(nextProject);
  if (areSnapshotsEqual(previous, next)) {
    return { ...state, project: nextProject };
  }
  const past = [...state.past, previous].slice(-HISTORY_LIMIT);
  return {
    ...state,
    project: nextProject,
    past,
    future: [],
  };
}

function withCoalescedHistory(
  state: EditorState,
  nextProject: ProjectState,
  key: HistoryCoalesceKey,
  coalesce: boolean,
): EditorState {
  if (!state.project) {
    return { ...state, project: nextProject, coalesceKey: null };
  }

  if (coalesce && key && state.coalesceKey === key && state.past.length > 0) {
    return {
      ...state,
      project: nextProject,
      future: [],
      coalesceKey: key,
    };
  }

  if (coalesce && key) {
    const pushed = pushHistory(state, nextProject);
    return { ...pushed, coalesceKey: key };
  }

  const pushed = pushHistory(state, nextProject);
  return { ...pushed, coalesceKey: null };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "LOAD_PROJECT":
      return {
        ...createInitialEditorState(),
        project: action.project,
        ui: {
          ...createInitialEditorState().ui,
          hasWebGL: state.ui.hasWebGL,
          storageWarning: state.ui.storageWarning,
        },
      };
    case "CLEAR_PROJECT":
      return {
        ...createInitialEditorState(),
        ui: {
          ...createInitialEditorState().ui,
          hasWebGL: state.ui.hasWebGL,
        },
      };
    case "SET_MODE":
      return {
        ...state,
        ui: { ...state.ui, mode: action.mode },
        coalesceKey: null,
      };
    case "SET_ACTIVE_ADJUSTMENT":
      return {
        ...state,
        ui: { ...state.ui, activeAdjustment: action.key },
        coalesceKey: null,
      };
    case "SET_COMPARING":
      return { ...state, ui: { ...state.ui, comparing: action.comparing } };
    case "SET_EXPORT_OPEN":
      return { ...state, ui: { ...state.ui, exportOpen: action.open } };
    case "SET_HAS_WEBGL":
      return { ...state, ui: { ...state.ui, hasWebGL: action.hasWebGL } };
    case "SET_STORAGE_WARNING":
      return { ...state, ui: { ...state.ui, storageWarning: action.warning } };
    case "SET_BUSY":
      return { ...state, ui: { ...state.ui, busy: action.busy } };
    case "SET_RENDERER_STATUS":
      return {
        ...state,
        ui: { ...state.ui, rendererStatus: action.status },
      };
    case "COMMIT_HISTORY":
      return { ...state, coalesceKey: null };
    case "SET_ADJUSTMENT": {
      if (!state.project) return state;
      const value = action.value;
      const nextProject: ProjectState = {
        ...state.project,
        adjustments: { ...state.project.adjustments, [action.key]: value },
        updatedAt: Date.now(),
      };
      return withCoalescedHistory(
        state,
        nextProject,
        `adjust:${action.key}`,
        action.coalesce ?? true,
      );
    }
    case "RESET_ADJUSTMENT": {
      if (!state.project) return state;
      const defaults = createDefaultAdjustments();
      const nextProject: ProjectState = {
        ...state.project,
        adjustments: {
          ...state.project.adjustments,
          [action.key]: defaults[action.key],
        },
        updatedAt: Date.now(),
      };
      return withCoalescedHistory(state, nextProject, null, false);
    }
    case "RESET_ALL_ADJUSTMENTS": {
      if (!state.project) return state;
      const nextProject: ProjectState = {
        ...state.project,
        adjustments: createDefaultAdjustments(),
        updatedAt: Date.now(),
      };
      return withCoalescedHistory(state, nextProject, null, false);
    }
    case "SET_CROP": {
      if (!state.project) return state;
      const nextProject: ProjectState = {
        ...state.project,
        crop: {
          ...state.project.crop,
          ...action.crop,
          bounds: action.crop.bounds
            ? { ...action.crop.bounds }
            : { ...state.project.crop.bounds },
        },
        updatedAt: Date.now(),
      };
      return withCoalescedHistory(
        state,
        nextProject,
        "crop-gesture",
        action.coalesce ?? true,
      );
    }
    case "RESET_CROP": {
      if (!state.project) return state;
      const nextProject: ProjectState = {
        ...state.project,
        crop: createDefaultCrop(),
        updatedAt: Date.now(),
      };
      return withCoalescedHistory(state, nextProject, null, false);
    }
    case "UNDO": {
      if (!state.project || state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      const current = snapshotFromProject(state.project);
      return {
        ...state,
        project: applySnapshot(state.project, previous),
        past: state.past.slice(0, -1),
        future: [current, ...state.future].slice(0, HISTORY_LIMIT),
        coalesceKey: null,
      };
    }
    case "REDO": {
      if (!state.project || state.future.length === 0) return state;
      const next = state.future[0]!;
      const current = snapshotFromProject(state.project);
      return {
        ...state,
        project: applySnapshot(state.project, next),
        past: [...state.past, current].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        coalesceKey: null,
      };
    }
    default:
      return state;
  }
}
