"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/app/lib/editor/context";
import { AdjustPanel } from "./AdjustPanel";
import { CropPanel } from "./CropPanel";
import { ExportSheet } from "./ExportSheet";
import { TopToolbar } from "./TopToolbar";
import { Viewport } from "./Viewport";
import type {
  ExportDimensions,
  ExportOptions,
  ViewTransform,
} from "@/app/lib/editor/types";

export interface EditorShellProps {
  canvasRef: (node: HTMLCanvasElement | null) => void;
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
        busy={Boolean(ui.busy) || exportProgress !== null}
        onNewPhoto={() => setNewPhotoOpen(true)}
        onUndo={undo}
        onRedo={redo}
        onExport={() => setExportOpen(true)}
      />

      <Viewport
        mode={ui.mode}
        crop={project.crop}
        sourceWidth={project.source.width}
        sourceHeight={project.source.height}
        canvasRef={canvasRef}
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

      <div
        className="se-tool-deck shrink-0"
        style={{
          paddingBottom: "max(0.2rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(0.35rem, env(safe-area-inset-left))",
          paddingRight: "max(0.35rem, env(safe-area-inset-right))",
        }}
      >
        <Tabs
          value={ui.mode}
          onValueChange={(value) => {
            if (value === "adjust" || value === "crop") {
              onViewTransformReset();
              setMode(value);
            }
          }}
          className="se-editor-tabs flex flex-col px-1 pt-1"
        >
          <TabsContent value="adjust" className="se-editor-panel mt-0">
            <AdjustPanel
              activeKey={ui.activeAdjustment}
              values={project.adjustments}
              hasWebGL={ui.hasWebGL}
              onSelect={setActiveAdjustment}
              onChange={(key, value) => setAdjustment(key, value, true)}
              onReset={resetAdjustment}
              onResetAll={resetAllAdjustments}
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

          <TabsList className="se-mode-tabs mx-auto mt-0.5 w-full max-w-[12rem] justify-center gap-4 bg-transparent pb-0.5">
            <TabsTrigger
              value="adjust"
              className="min-h-10 flex-1 flex-col gap-0.5 px-2 text-[10px] font-medium tracking-wide uppercase"
            >
              <AdjustIcon />
              Adjust
            </TabsTrigger>
            <TabsTrigger
              value="crop"
              className="min-h-10 flex-1 flex-col gap-0.5 px-2 text-[10px] font-medium tracking-wide uppercase"
            >
              <CropIcon />
              Crop
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
            className="min-h-12 w-full rounded-lg text-[16px] font-medium"
            onClick={() => {
              setNewPhotoOpen(false);
              onNewPhoto();
            }}
          >
            Discard & open new
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="min-h-12 w-full text-[16px] text-[var(--se-muted)]"
            onClick={() => setNewPhotoOpen(false)}
          >
            Keep editing
          </Button>
        </div>
      </BottomSheet>

      <p className="sr-only" aria-live="polite">
        {ui.mode === "adjust"
          ? `${ui.activeAdjustment} ${project.adjustments[ui.activeAdjustment]}`
          : "Crop tools"}
      </p>
    </div>
  );
}

function AdjustIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h10M18 7h2M4 17h2M10 17h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="17" r="2.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3v14h14M3 7h14v14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
