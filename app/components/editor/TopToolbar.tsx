"use client";

import { Button } from "@/components/ui/button";

export interface TopToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  busy?: boolean;
  onNewPhoto: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}

export function TopToolbar({
  canUndo,
  canRedo,
  busy = false,
  onNewPhoto,
  onUndo,
  onRedo,
  onExport,
}: TopToolbarProps) {
  return (
    <header
      className="se-toolbar relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-1"
      style={{
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
        paddingTop: "max(0.35rem, env(safe-area-inset-top))",
        paddingLeft: "max(0.35rem, env(safe-area-inset-left))",
        paddingRight: "max(0.35rem, env(safe-area-inset-right))",
        minHeight: "2.75rem",
      }}
    >
      <div className="flex items-center justify-start">
        <Button
          variant="ghost"
          size="sm"
          className="se-control min-h-11 rounded-lg px-3 text-[15px] font-normal text-[var(--se-muted)]"
          aria-label="Discard edits and open another photo"
          disabled={busy}
          onClick={onNewPhoto}
        >
          Discard
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="se-control min-h-11 min-w-11 text-[var(--se-fg)] disabled:opacity-45"
          aria-label="Undo"
          disabled={!canUndo || busy}
          onClick={onUndo}
        >
          <UndoIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="se-control min-h-11 min-w-11 text-[var(--se-fg)] disabled:opacity-45"
          aria-label="Redo"
          disabled={!canRedo || busy}
          onClick={onRedo}
        >
          <RedoIcon />
        </Button>
      </div>

      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          size="sm"
          className="min-h-9 rounded-full px-4 text-[14px] font-medium"
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

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 14L4 9l5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h10.5a5.5 5.5 0 1 1 0 11H12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 14l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9H9.5a5.5 5.5 0 1 0 0 11H12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
