"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { playConfirm, unlockTickAudio } from "@/app/lib/audio/tick";
import { IconProvider } from "@/components/ui/icons";
import { EditorProvider, useEditor } from "@/app/lib/editor/context";
import type { ExportOptions, ExportResult } from "@/app/lib/editor/types";
import { ImportError } from "@/app/lib/image/decode";
import { describeExportFailure } from "@/app/lib/render/exportError";
import { EditorShell } from "./EditorShell";
import { ImportScreen } from "./ImportScreen";
import { usePhotoExport, useRenderer } from "./useRenderer";

type SaveOutcome = "shared" | "downloaded" | "cancelled";

async function shareOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<SaveOutcome> {
  const file = new File([blob], filename, { type: mimeType });
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShare) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
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
  return "downloaded";
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

function formatLabel(format: ExportOptions["format"]): string {
  return format === "image/png"
    ? "PNG"
    : format === "image/webp"
      ? "WebP"
      : "JPEG";
}

/**
 * A sentence for anything the export had to change to succeed. Saying nothing
 * would be the easier code and the worse behaviour: someone who asked for full
 * size deserves to know they did not get it.
 */
function describeExportFallback(
  result: ExportResult,
  options: ExportOptions,
): string | null {
  const notes: string[] = [];
  if (result.downscaled) {
    notes.push(
      `resized to ${result.width} × ${result.height} px so this device could encode it`,
    );
  }
  if (result.format !== options.format) {
    notes.push(
      `saved as ${formatLabel(result.format)} — your browser can't encode ${formatLabel(options.format)}`,
    );
  }
  return notes.length ? notes.join("; ") : null;
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

  // Mobile browsers start every AudioContext suspended and only let it resume
  // inside a gesture. The individual controls unlock on their own handlers,
  // but on a phone the first thing touched is usually the photo or a menu, so
  // claim the very first gesture of the session instead of the first slider.
  // iOS also suspends on backgrounding, hence re-arming when the page returns.
  useEffect(() => {
    const unlock = () => unlockTickAudio();
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    for (const type of events) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", unlock);
    return () => {
      for (const type of events) {
        window.removeEventListener(type, unlock, { capture: true });
      }
      document.removeEventListener("visibilitychange", unlock);
    };
  }, []);

  const { canvasRef, canvasKey, exportPhoto, getExportDimensions } =
    useRenderer(
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
            : "This photo couldn't be opened.";
        setImportError(message);
        showToast({
          title: "Couldn't open photo",
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
      // Still inside the click that started the export: the only moment a
      // suspended context is allowed to resume, and the confirmation lands
      // long after any gesture of its own.
      unlockTickAudio();
      const controller = new AbortController();
      abortRef.current = controller;
      setExportProgress(0);
      setExportCancelling(false);
      setBusy("Saving…");
      try {
        const result = await runExport(options, controller.signal, (progress) =>
          setExportProgress(progress),
        );
        const base =
          state.project.source.name.replace(/\.[^.]+$/, "") || "raspy";
        // Named from what was produced, not what was requested: the export can
        // fall back to a format the browser supports or to a smaller size.
        const filename = `${base}-edit.${extensionFor(result.format)}`;
        const outcome = await shareOrDownload(
          result.blob,
          filename,
          result.format,
        );
        if (outcome === "cancelled") {
          showToast({ title: "Save cancelled", status: "neutral" });
        } else {
          // Only a real save gets the flourish — a cancelled share is not a
          // success, however far the export got.
          playConfirm();
          const fallback = describeExportFallback(result, options);
          showToast({
            title: outcome === "shared" ? "Shared" : "Saved",
            description: fallback
              ? `${outcome === "shared" ? filename : `Saved as ${filename}`} — ${fallback}`
              : outcome === "shared"
                ? filename
                : `Saved as ${filename}`,
            status: "success",
            // A silent downgrade should be readable, not glimpsed.
            timeout: fallback ? 8000 : undefined,
          });
        }
        setExportOpen(false);
      } catch (error) {
        if (controller.signal.aborted) {
          showToast({ title: "Save cancelled", status: "neutral" });
        } else {
          // Renderer failures carry internals like raw shader logs; log those
          // and show the actionable message the export attached.
          console.error("Save failed", error);
          const { title, description } = describeExportFailure(error);
          showToast({
            title,
            description,
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
      title: "Last edit restored",
      description: "Picked up where you left off.",
      status: "info",
    });
  }, [state.ui.draftRestored, showToast]);

  useEffect(() => {
    if (state.ui.storageWarning) {
      showToast({
        title: state.ui.storageWarning.title,
        description: state.ui.storageWarning.message,
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
              canvasKey={canvasKey}
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
      <IconProvider>
        <ToastProvider>
          <EditorAppInner />
        </ToastProvider>
      </IconProvider>
    </EditorProvider>
  );
}
