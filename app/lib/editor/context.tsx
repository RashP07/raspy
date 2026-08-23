"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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
} from "./types";
import { decodeImageSource, ImportError } from "@/app/lib/image/decode";
import { purgeStoredDraft } from "@/app/lib/storage/idb";

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
  importFile: (file: File) => Promise<void>;
  clearProject: () => Promise<void>;
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
  const mountedRef = useRef(true);

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

    // One-shot cleanup for the drafts autosave used to leave behind. Nothing
    // waits on it and nothing surfaces if it fails; the next visit retries.
    void purgeStoredDraft();

    return () => {
      mountedRef.current = false;
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

  // Async only because the caller has always awaited it, and a photo leaving
  // the editor is exactly the shape of thing that may need to again.
  const clearProject = useCallback(async () => {
    dispatch({ type: "CLEAR_PROJECT" });
  }, []);

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      dispatch,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      importFile,
      clearProject,
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
    [state, importFile, clearProject],
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
