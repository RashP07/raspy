"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { playConfirm, unlockTickAudio } from "@/app/lib/audio/tick";
import { useEditor } from "@/app/lib/editor/context";
import type {
  ExportOptions,
  ExportResult,
  SaveDelivery,
} from "@/app/lib/editor/types";
import { describeExportFailure } from "@/app/lib/render/exportError";
import { EditorShell } from "./EditorShell";
import { usePhotoExport, useRenderer } from "./useRenderer";

type SaveOutcome = "shared" | "downloaded" | "cancelled";

/**
 * Hands the finished file over the way the person asked for.
 *
 * Sharing is only attempted when it was chosen: a device with a share sheet
 * used to get one whether or not it wanted one, which on Android left no way
 * to put the file in Downloads. A share that fails for any reason other than
 * being dismissed still falls through to the download — the file exists, and
 * losing it to a platform error helps nobody.
 */
async function deliverFile(
  blob: Blob,
  filename: string,
  mimeType: string,
  delivery: SaveDelivery,
): Promise<SaveOutcome> {
  if (delivery === "share") {
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
  }

  return download(blob, filename);
}

function download(blob: Blob, filename: string): SaveOutcome {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking in the same tick races the download on some Android builds, which
  // read the blob after the click returns and end up with a 0-byte file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

export interface LoadedEditorProps {
  onNewPhoto: () => void;
}

/**
 * Everything that only exists once a photo is open: the renderer, the export
 * pipeline, and the editing chrome. Split from EditorApp so the import screen
 * ships without the WebGL renderer, shaders, and encoders behind it; this
 * module is fetched on the first sign of intent to open a photo.
 */
export default function LoadedEditor({ onNewPhoto }: LoadedEditorProps) {
  const { state, setExportOpen, setBusy, setRendererStatus } = useEditor();
  const { showToast } = useToast();
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

  // A new photo always arrives on a fresh mount (clearing the project unmounts
  // this component), so the view starts at zoom 1 without a reset call.
  const { canvasRef, canvasKey, exportPhoto, getExportDimensions } =
    useRenderer(
      state.project,
      state.ui.comparing,
      state.ui.mode,
      viewTransform,
      setRendererStatus,
    );
  const runExport = usePhotoExport(exportPhoto);

  const handleExport = useCallback(
    async (options: ExportOptions, delivery: SaveDelivery) => {
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
        const outcome = await deliverFile(
          result.blob,
          filename,
          result.format,
          delivery,
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

  return (
    <EditorShell
      canvasRef={canvasRef}
      canvasKey={canvasKey}
      onExport={handleExport}
      exportProgress={exportProgress}
      exportCancelling={exportCancelling}
      onCancelExport={handleCancelExport}
      onNewPhoto={onNewPhoto}
      viewTransform={viewTransform}
      onViewTransformChange={setViewTransform}
      onViewTransformReset={resetViewTransform}
      getExportDimensions={getExportDimensions}
    />
  );
}
