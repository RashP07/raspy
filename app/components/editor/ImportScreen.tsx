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
      className="relative flex h-full min-h-0 w-full flex-col"
      style={{
        background: "var(--se-bg)",
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
        paddingRight: "max(1.5rem, env(safe-area-inset-right))",
      }}
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
      {/* Caps the measure so the headline stays readable and the button keeps
          a button's proportions on a desktop window. */}
      <div className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            Raspy
          </span>
          <SettingsMenu />
        </header>

        {/* Anchored to the bottom of its space rather than centred in it: the
          copy then reads as part of the same block as the action, and the
          empty room collects above instead of splitting evenly around it. */}
        <main className="flex min-h-0 flex-1 flex-col justify-end pt-8 pb-14">
          <h1 className="max-w-[15ch] text-[34px] leading-[1.1] font-medium tracking-[-0.045em] text-balance">
            Edit photos that never leave your device.
          </h1>
          <p
            className="mt-4 max-w-[28ch] text-[16px] leading-snug text-balance"
            style={{ color: "var(--se-muted)" }}
          >
            No account. No upload. Nothing to delete later.
          </p>
        </main>

        <div className="flex shrink-0 flex-col gap-3">
          {error ? (
            <p
              role="alert"
              className="text-[15px] leading-snug"
              style={{ color: "var(--se-danger)" }}
            >
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
              <p className="text-[16px]" style={{ color: "var(--se-muted)" }}>
                {busy}
              </p>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full rounded-xl font-medium"
              onClick={() => inputRef.current?.click()}
            >
              Open photo
            </Button>
          )}

          {hasDraft && onRestoreDraft && !isBusy ? (
            <Button
              variant="ghost"
              size="md"
              className="w-full rounded-xl text-[var(--se-muted)] hover:text-[var(--se-fg)]"
              onClick={onRestoreDraft}
            >
              Continue last edit
            </Button>
          ) : null}

          <p
            className="text-center text-[13px]"
            style={{ color: "var(--se-muted)" }}
          >
            {FORMATS}
            <span className="hidden md:inline">
              {" "}
              · or drop a photo anywhere
            </span>
          </p>

          {draftRestored ? (
            <p
              className="text-center text-[12px]"
              style={{ color: "var(--se-muted)" }}
            >
              Last edit restored from this device
            </p>
          ) : null}
        </div>
      </div>

      {dragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed"
          style={{ borderColor: "var(--se-fg)", opacity: 0.35 }}
        />
      ) : null}
    </div>
  );
}
