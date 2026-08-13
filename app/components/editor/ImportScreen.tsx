"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SettingsMenu } from "./SettingsMenu";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

/** HEIC leads: it is the format an iPhone user is unsure will be accepted. */
const FORMATS = "HEIC · JPEG · PNG · WebP";

export interface ImportScreenProps {
  onImport: (file: File) => void | Promise<void>;
  busy?: string | null;
  hasDraft?: boolean;
  draftRestored?: boolean;
  onRestoreDraft?: () => void;
  error?: string | null;
}

export function ImportScreen({
  onImport,
  busy,
  hasDraft = false,
  draftRestored = false,
  onRestoreDraft,
  error,
}: ImportScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // A drag crossing a child element fires enter/leave in pairs; counting keeps
  // the highlight from flickering off halfway across the screen.
  const dragDepth = useRef(0);
  const isBusy = Boolean(busy);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || isBusy) return;
      await onImport(file);
    },
    [isBusy, onImport],
  );

  const endDrag = () => {
    dragDepth.current = 0;
    setDragging(false);
  };

  return (
    <div
      className="se-page relative flex h-full min-h-0 w-full flex-col bg-bg text-fg"
      // The whole screen is the drop target, so nothing competes with the
      // button for the same job the way a separate dashed box did.
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        if (!isBusy) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) endDrag();
      }}
      onDrop={(event) => {
        event.preventDefault();
        endDrag();
        void handleFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {/* The stage already caps its own width (480/520/560px), so the gutter
          above is the only thing that should set the edges. A second cap here
          used to win at the wider two steps and pushed the sides out to 56px
          against a ~25px top and bottom, which is what read as lopsided. The
          headline and the line under it carry their own measure caps. */}
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between">
          <span className="text-body font-semibold tracking-snug">Raspy</span>
          <SettingsMenu />
        </header>

        {/* Anchored to the bottom of its space rather than centred in it: the
          copy then reads as part of the same block as the action, and the
          empty room collects above instead of splitting evenly around it. */}
        <main className="flex min-h-0 flex-1 flex-col justify-end pt-8 pb-14">
          <h1 className="max-w-[15ch] text-display font-medium text-balance">
            Edit photos that never leave your device.
          </h1>
          <p className="mt-4 max-w-[28ch] text-body leading-snug text-balance text-muted">
            No account. No upload. Nothing to delete later.
          </p>
        </main>

        <div className="flex shrink-0 flex-col gap-3">
          {error ? (
            <p role="alert" className="text-body leading-snug text-danger">
              {error}
            </p>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Open photo"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              void handleFiles(files);
            }}
          />

          {isBusy ? (
            // Only the action swaps out. Holding the headline in place means the
            // screen does not appear to navigate while a photo decodes.
            <div
              role="status"
              className="flex h-12 items-center justify-center gap-3"
            >
              <Spinner size={20} decorative />
              <p className="text-body text-muted">{busy}</p>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full rounded-control font-medium"
              onClick={() => inputRef.current?.click()}
            >
              Open photo
            </Button>
          )}

          {hasDraft && onRestoreDraft && !isBusy ? (
            <Button
              variant="ghost"
              size="md"
              className="w-full rounded-control text-muted hover:text-fg"
              onClick={onRestoreDraft}
            >
              Continue last edit
            </Button>
          ) : null}

          <p className="text-center text-caption text-muted">
            {FORMATS}
            <span className="hidden md:inline">
              {" "}
              · or drop a photo anywhere
            </span>
          </p>

          {draftRestored ? (
            <p className="text-center text-caption text-muted">
              Last edit restored from this device
            </p>
          ) : null}
        </div>
      </div>

      {dragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-panel border-2 border-dashed border-fg opacity-35"
        />
      ) : null}
    </div>
  );
}
