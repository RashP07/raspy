"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createProject } from "./defaults";
import {
  createInitialEditorState,
  editorReducer,
  type EditorAction,
  type EditorState,
} from "./reducer";
import {
  NO_WEBGL_MESSAGE,
  type AdjustmentKey,
  type CropState,
  type EditorMode,
  type EditorUiState,
  type ProjectState,
} from "./types";
import { decodeImageSource, ImportError } from "@/app/lib/image/decode";
import {
  clearDraft,
  loadDraft,
  requestPersistentStorage,
  saveDraft,
} from "@/app/lib/storage/idb";

const AUTOSAVE_MS = 500;

function probeWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    return Boolean(gl);
  } catch {
    return false;
  }
}

export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  canUndo: boolean;
  canRedo: boolean;
  draftAvailable: ProjectState | null;
  importFile: (file: File) => Promise<void>;
  clearProject: () => Promise<void>;
  restoreDraft: () => void;
  setMode: (mode: EditorMode) => void;
  setActiveAdjustment: (key: AdjustmentKey) => void;
  setComparing: (comparing: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setBusy: (busy: string | null) => void;
  setRendererStatus: (status: EditorUiState["rendererStatus"]) => void;
  setAdjustment: (
    key: AdjustmentKey,
    value: number,
    coalesce?: boolean,
  ) => void;
  resetAdjustment: (key: AdjustmentKey) => void;
  resetAllAdjustments: () => void;
  setCrop: (crop: Partial<CropState>, coalesce?: boolean) => void;
  resetCrop: () => void;
  undo: () => void;
  redo: () => void;
  commitHistory: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    createInitialEditorState,
  );
  const [draftAvailable, setDraftAvailable] = useState<ProjectState | null>(
    null,
  );
  const mountedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    dispatch({ type: "SET_HAS_WEBGL", hasWebGL: probeWebGL2() });

    const onCapability = (event: Event) => {
      const detail = (event as CustomEvent<{ supportsAdjustments: boolean }>)
        .detail;
      if (detail) {
        dispatch({
          type: "SET_HAS_WEBGL",
          hasWebGL: detail.supportsAdjustments,
        });
        if (!detail.supportsAdjustments) {
          dispatch({
            type: "SET_STORAGE_WARNING",
            warning: {
              title: "Adjustments unavailable",
              message: NO_WEBGL_MESSAGE,
            },
          });
        }
      }
    };
    window.addEventListener(
      "raspy:renderer-capability",
      onCapability as EventListener,
    );

    const onContextLost = () => {
      dispatch({
        type: "SET_STORAGE_WARNING",
        warning: {
          title: "Restoring preview",
          message:
            "The graphics context was interrupted. Restoring the preview…",
        },
      });
    };
    const onRendererStatus = (event: Event) => {
      const detail = (
        event as CustomEvent<{ status: EditorUiState["rendererStatus"] }>
      ).detail;
      if (detail?.status) {
        dispatch({ type: "SET_RENDERER_STATUS", status: detail.status });
      }
    };
    window.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener(
      "raspy:renderer-status",
      onRendererStatus as EventListener,
    );

    void (async () => {
      try {
        const draft = await loadDraft();
        if (!mountedRef.current) return;
        if (draft) setDraftAvailable(draft);
      } catch {
        if (mountedRef.current) {
          dispatch({
            type: "SET_STORAGE_WARNING",
            warning: {
              title: "Storage",
              message: "Your last edit couldn't be read from this device.",
            },
          });
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      window.removeEventListener(
        "raspy:renderer-capability",
        onCapability as EventListener,
      );
      window.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener(
        "raspy:renderer-status",
        onRendererStatus as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const project = state.project;
    if (!project) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft(project).catch(() => {
        if (mountedRef.current) {
          dispatch({
            type: "SET_STORAGE_WARNING",
            warning: {
              title: "Storage",
              message: "Autosave failed. Your edits may not be here next time.",
            },
          });
        }
      });
    }, AUTOSAVE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.project]);

  const importFile = useCallback(async (file: File) => {
    dispatch({ type: "SET_BUSY", busy: "Opening photo…" });
    try {
      const decoded = await decodeImageSource(file);
      const project = createProject({
        name: decoded.name,
        mimeType: decoded.mimeType,
        width: decoded.width,
        height: decoded.height,
        blob: decoded.blob,
        preview: decoded.bitmap,
      });
      dispatch({ type: "LOAD_PROJECT", project });
      setDraftAvailable(null);
      void requestPersistentStorage();
    } catch (error) {
      const message =
        error instanceof ImportError
          ? error.message
          : "This photo couldn't be opened.";
      throw new ImportError(
        message,
        error instanceof ImportError ? error.code : "DECODE",
      );
    } finally {
      dispatch({ type: "SET_BUSY", busy: null });
    }
  }, []);

  const clearProject = useCallback(async () => {
    dispatch({ type: "CLEAR_PROJECT" });
    setDraftAvailable(null);
    try {
      await clearDraft();
    } catch {
      dispatch({
        type: "SET_STORAGE_WARNING",
        warning: {
          title: "Storage",
          message: "The saved draft couldn't be removed from this device.",
        },
      });
    }
  }, []);

  const restoreDraft = useCallback(() => {
    if (!draftAvailable) return;
    dispatch({ type: "LOAD_PROJECT", project: draftAvailable, restored: true });
    setDraftAvailable(null);
  }, [draftAvailable]);

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      dispatch,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      draftAvailable,
      importFile,
      clearProject,
      restoreDraft,
      setMode: (mode) => dispatch({ type: "SET_MODE", mode }),
      setActiveAdjustment: (key) =>
        dispatch({ type: "SET_ACTIVE_ADJUSTMENT", key }),
      setComparing: (comparing) =>
        dispatch({ type: "SET_COMPARING", comparing }),
      setExportOpen: (open) => dispatch({ type: "SET_EXPORT_OPEN", open }),
      setBusy: (busy) => dispatch({ type: "SET_BUSY", busy }),
      setRendererStatus: (status) =>
        dispatch({ type: "SET_RENDERER_STATUS", status }),
      setAdjustment: (key, value, coalesce) =>
        dispatch({ type: "SET_ADJUSTMENT", key, value, coalesce }),
      resetAdjustment: (key) => dispatch({ type: "RESET_ADJUSTMENT", key }),
      resetAllAdjustments: () => dispatch({ type: "RESET_ALL_ADJUSTMENTS" }),
      setCrop: (crop, coalesce) =>
        dispatch({ type: "SET_CROP", crop, coalesce }),
      resetCrop: () => dispatch({ type: "RESET_CROP" }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      commitHistory: () => dispatch({ type: "COMMIT_HISTORY" }),
    }),
    [state, draftAvailable, importFile, clearProject, restoreDraft],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within EditorProvider");
  }
  return ctx;
}
