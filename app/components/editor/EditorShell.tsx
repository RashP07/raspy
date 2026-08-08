"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BottomSheet } from "@/components/ui/sheet";
import { AdjustModeIcon, CropModeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/app/lib/editor/context";
import { playModeChange, unlockTickAudio } from "@/app/lib/audio/tick";
import { AdjustPanel } from "./AdjustPanel";
import { CropPanel } from "./CropPanel";
import { ExportSheet } from "./ExportSheet";
import { TopToolbar } from "./TopToolbar";
import { Viewport } from "./Viewport";
import {
  ADJUSTMENT_KEYS,
  ADJUSTMENT_META,
  type ExportDimensions,
  type ExportOptions,
  type ViewTransform,
} from "@/app/lib/editor/types";

export interface EditorShellProps {
  canvasRef: (node: HTMLCanvasElement | null) => void;
  canvasKey: number;
  onExport: (options: ExportOptions) => void;
  exportProgress: number | null;
  exportCancelling?: boolean;
  onCancelExport?: () => void;
  onNewPhoto: () => void;
  viewTransform: ViewTransform;
  onViewTransformChange: (view: ViewTransform) => void;
  onViewTransformReset: () => void;
  getExportDimensions: (options: ExportOptions) => ExportDimensions | null;
}

export function EditorShell({
  canvasRef,
  canvasKey,
  onExport,
  exportProgress,
  exportCancelling = false,
  onCancelExport,
  onNewPhoto,
  viewTransform,
  onViewTransformChange,
  onViewTransformReset,
  getExportDimensions,
}: EditorShellProps) {
  const {
    state,
    canUndo,
    canRedo,
    setMode,
    setActiveAdjustment,
    setComparing,
    setExportOpen,
    setAdjustment,
    resetAdjustment,
    resetAllAdjustments,
    setCrop,
    resetCrop,
    undo,
    redo,
    commitHistory,
  } = useEditor();

  const { project, ui } = state;
  const [newPhotoOpen, setNewPhotoOpen] = useState(false);
  const panelStackRef = useRef<HTMLDivElement>(null);

  // The deck is as tall as whichever panel is showing, and the two differ by
  // ~100px. Pinning an explicit height lets that difference animate instead of
  // snapping, and writing it straight to the node keeps it out of render.
  useLayoutEffect(() => {
    const stack = panelStackRef.current;
    if (!stack) return;

    const measure = () => {
      const panel = stack.querySelector<HTMLElement>(
        '[role="tabpanel"]:not([hidden])',
      );
      if (!panel) return;
      stack.style.height = `${panel.offsetHeight}px`;
      // Held back until after the first measurement so the deck does not
      // animate up from nothing on load.
      stack.dataset.ready = "";
    };

    measure();
    const observer = new ResizeObserver(measure);
    stack
      .querySelectorAll<HTMLElement>('[role="tabpanel"]')
      .forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, [ui.mode]);
  const [straightening, setStraightening] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [redo, undo]);

  if (!project) return null;

  const hasAnyAdjustments = ADJUSTMENT_KEYS.some(
    (key) => project.adjustments[key] !== 0,
  );

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={
        {
          background: "var(--se-bg)",
          color: "var(--se-fg)",
          fontFamily: "var(--font-ui)",
        } as CSSProperties
      }
    >
      <TopToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canResetAll={hasAnyAdjustments}
        busy={Boolean(ui.busy) || exportProgress !== null}
        onNewPhoto={() => setNewPhotoOpen(true)}
        onResetAll={resetAllAdjustments}
        onUndo={undo}
        onRedo={redo}
        onExport={() => setExportOpen(true)}
      />

      <h1 className="sr-only">Editing photo</h1>

      <main className="flex min-h-0 flex-1 flex-col">
        <Viewport
          mode={ui.mode}
          crop={project.crop}
          sourceWidth={project.source.width}
          sourceHeight={project.source.height}
          canvasRef={canvasRef}
          canvasKey={canvasKey}
          onCropChange={setCrop}
          onCropCommit={commitHistory}
          comparing={ui.comparing}
          rendererStatus={ui.rendererStatus}
          onCompareStart={() => setComparing(true)}
          onCompareEnd={() => setComparing(false)}
          viewTransform={viewTransform}
          onViewTransformChange={onViewTransformChange}
          straightening={straightening}
        />

        <div className="se-tool-deck shrink-0">
          <Tabs
            value={ui.mode}
            onValueChange={(value) => {
              if (value === "adjust" || value === "crop") {
                if (value !== ui.mode) {
                  unlockTickAudio();
                  playModeChange();
                }
                onViewTransformReset();
                setMode(value);
              }
            }}
            className="se-editor-tabs flex flex-col pt-2"
          >
            <div ref={panelStackRef} className="se-panel-stack">
              <TabsContent value="adjust" className="se-editor-panel mt-0">
                <AdjustPanel
                  activeKey={ui.activeAdjustment}
                  values={project.adjustments}
                  hasWebGL={ui.hasWebGL}
                  onSelect={setActiveAdjustment}
                  onChange={(key, value) => setAdjustment(key, value, true)}
                  onReset={resetAdjustment}
                  onCommit={commitHistory}
                />
              </TabsContent>

              <TabsContent value="crop" className="se-editor-panel mt-0">
                <CropPanel
                  crop={project.crop}
                  sourceWidth={project.source.width}
                  sourceHeight={project.source.height}
                  onChange={setCrop}
                  onReset={resetCrop}
                  onCommit={commitHistory}
                  onStraightenStart={() => setStraightening(true)}
                  onStraightenEnd={() => setStraightening(false)}
                />
              </TabsContent>
            </div>

            <div className="se-mode-bar">
              <TabsList className="se-mode-tabs">
                <TabsIndicator className="se-mode-thumb" />
                <TabsTrigger value="adjust" className="se-mode-tab">
                  <AdjustModeIcon />
                  Adjust
                </TabsTrigger>
                <TabsTrigger value="crop" className="se-mode-tab">
                  <CropModeIcon />
                  Crop
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>
      </main>

      <ExportSheet
        open={ui.exportOpen}
        onOpenChange={setExportOpen}
        onExport={onExport}
        progress={exportProgress}
        cancelling={exportCancelling}
        onCancelExport={onCancelExport}
        sourceWidth={project.source.width}
        sourceHeight={project.source.height}
        crop={project.crop}
        sourceMimeType={project.source.mimeType}
        getExportDimensions={getExportDimensions}
      />

      <BottomSheet
        open={newPhotoOpen}
        onOpenChange={setNewPhotoOpen}
        title="Discard edits?"
        description="Your current edit will be removed from this device."
        className="border-[var(--se-hairline)] bg-[var(--se-surface)] text-[var(--se-fg)]"
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            size="lg"
            className="w-full rounded-lg font-medium"
            onClick={() => {
              setNewPhotoOpen(false);
              onNewPhoto();
            }}
          >
            Discard and open another photo
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-[var(--se-muted)]"
            onClick={() => setNewPhotoOpen(false)}
          >
            Keep editing
          </Button>
        </div>
      </BottomSheet>

      {/* Names the selected tool only — the sliders publish their own values
          via aria-valuetext, so echoing them here would double every step. */}
      <p className="sr-only" aria-live="polite">
        {ui.mode === "adjust"
          ? ADJUSTMENT_META[ui.activeAdjustment].label
          : "Crop tools"}
      </p>
    </div>
  );
}
