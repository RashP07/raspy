"use client";

import { Button } from "@/components/ui/button";
import { RedoIcon, ResetAllIcon, UndoIcon } from "@/components/ui/icons";
import { SettingsMenu } from "./SettingsMenu";

export interface TopToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  canResetAll: boolean;
  busy?: boolean;
  onNewPhoto: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetAll: () => void;
  onExport: () => void;
}

export function TopToolbar({
  canUndo,
  canRedo,
  canResetAll,
  busy = false,
  onNewPhoto,
  onUndo,
  onRedo,
  onResetAll,
  onExport,
}: TopToolbarProps) {
  return (
    <header
      className="se-toolbar relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center"
      style={{
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className="flex items-center justify-start">
        <Button
          variant="ghost"
          size="md"
          className="se-control se-edge-start rounded-lg font-normal text-[var(--se-muted)]"
          aria-label="Start over with another photo"
          disabled={busy}
          onClick={onNewPhoto}
        >
          New photo
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="se-control text-[var(--se-fg)] disabled:opacity-45"
          aria-label="Undo"
          disabled={!canUndo || busy}
          onClick={onUndo}
        >
          <UndoIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="se-control text-[var(--se-fg)] disabled:opacity-45"
          aria-label="Redo"
          disabled={!canRedo || busy}
          onClick={onRedo}
        >
          <RedoIcon />
        </Button>
        {/* Nothing to undo to zero means nothing to show. */}
        {canResetAll ? (
          <Button
            variant="ghost"
            size="icon"
            className="se-control text-[var(--se-fg)] disabled:opacity-45"
            aria-label="Reset all adjustments"
            title="Reset all adjustments"
            disabled={busy}
            onClick={onResetAll}
          >
            <ResetAllIcon />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1">
        <SettingsMenu />
        <Button
          variant="primary"
          size="sm"
          className="rounded-full px-4 font-medium"
          aria-label="Save photo"
          disabled={busy}
          onClick={onExport}
        >
          Save
        </Button>
      </div>
    </header>
  );
}
