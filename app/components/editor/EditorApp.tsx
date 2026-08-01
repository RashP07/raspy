"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { EditorProvider, useEditor } from "@/app/lib/editor/context";
import type { ExportOptions } from "@/app/lib/editor/types";
import { ImportError } from "@/app/lib/image/decode";
import { EditorShell } from "./EditorShell";
import { ImportScreen } from "./ImportScreen";
import { usePhotoExport, useRenderer } from "./useRenderer";

async function shareOrDownload(blob: Blob, filename: string, mimeType: string) {
  const file = new File([blob], filename, { type: mimeType });
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShare) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function extensionFor(format: ExportOptions["format"]): string {
  switch (format) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function EditorAppInner() {
  const {
    state,
    draftAvailable,
    importFile,
    clearProject,
    restoreDraft,
    setExportOpen,
    setBusy,
    setRendererStatus,
  } = useEditor();
  const { showToast } = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportCancelling, setExportCancelling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [viewTransform, setViewTransform] = useState({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const resetViewTransform = useCallback(
    () => setViewTransform({ zoom: 1, panX: 0, panY: 0 }),
    [],
  );

  const { canvasRef, exportPhoto, getExportDimensions } = useRenderer(
    state.project,
    state.ui.comparing,
    state.ui.mode,
    viewTransform,
    setRendererStatus,
  );
  const runExport = usePhotoExport(exportPhoto);

  const handleImport = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        await importFile(file);
        resetViewTransform();
      } catch (error) {
        const message =
          error instanceof ImportError
            ? error.message
            : "Could not import this photo.";
        setImportError(message);
        showToast({
          title: "Import failed",
          description: message,
          status: "error",
          timeout: 0,
        });
      }
    },
    [importFile, resetViewTransform, showToast],
  );

  const handleExport = useCallback(
    async (options: ExportOptions) => {
      if (!state.project) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setExportProgress(0);
      setExportCancelling(false);
      setBusy("Exporting…");
      try {
        const blob = await runExport(options, controller.signal, (progress) =>
          setExportProgress(progress),
        );
        const base =
          state.project.source.name.replace(/\.[^.]+$/, "") || "simplyedit";
        const filename = `${base}-edit.${extensionFor(options.format)}`;
        await shareOrDownload(blob, filename, options.format);
        showToast({
          title: "Exported",
          description: filename,
          status: "success",
        });
        setExportOpen(false);
      } catch (error) {
        if (controller.signal.aborted) {
          showToast({ title: "Export cancelled", status: "neutral" });
        } else {
          const message =
            error instanceof Error ? error.message : "Export failed";
          showToast({
            title: "Export failed",
            description: message,
            status: "error",
            timeout: 0,
          });
        }
      } finally {
        abortRef.current = null;
        setExportProgress(null);
        setExportCancelling(false);
        setBusy(null);
      }
    },
    [runExport, setBusy, setExportOpen, showToast, state.project],
  );

  const handleCancelExport = useCallback(() => {
    setExportCancelling(true);
    abortRef.current?.abort();
  }, []);

  const handleNewPhoto = useCallback(() => {
    void clearProject();
    setImportError(null);
    resetViewTransform();
  }, [clearProject, resetViewTransform]);

  useEffect(() => {
    if (!state.ui.draftRestored) return;
    showToast({
      title: "Draft restored",
      description: "Your last edit session was recovered.",
      status: "info",
    });
  }, [state.ui.draftRestored, showToast]);

  useEffect(() => {
    if (state.ui.storageWarning) {
      showToast({
        title: "Storage warning",
        description: state.ui.storageWarning,
        status: "neutral",
      });
    }
  }, [state.ui.storageWarning, showToast]);

  return (
    <>
      <div className="se-app-shell">
        <div className="se-stage">
          {!state.project ? (
            <ImportScreen
              onImport={handleImport}
              busy={state.ui.busy}
              hasDraft={Boolean(draftAvailable)}
              draftRestored={state.ui.draftRestored}
              onRestoreDraft={() => {
                resetViewTransform();
                void restoreDraft();
              }}
              error={importError}
            />
          ) : (
            <EditorShell
              canvasRef={canvasRef}
              onExport={handleExport}
              exportProgress={exportProgress}
              exportCancelling={exportCancelling}
              onCancelExport={handleCancelExport}
              onNewPhoto={handleNewPhoto}
              viewTransform={viewTransform}
              onViewTransformChange={setViewTransform}
              onViewTransformReset={resetViewTransform}
              getExportDimensions={getExportDimensions}
            />
          )}
        </div>
      </div>
    </>
  );
}

export function EditorApp() {
  return (
    <EditorProvider>
      <ToastProvider>
        <EditorAppInner />
      </ToastProvider>
    </EditorProvider>
  );
}
