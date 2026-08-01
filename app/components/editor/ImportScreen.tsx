"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

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
  const isBusy = Boolean(busy);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || isBusy) return;
      await onImport(file);
    },
    [isBusy, onImport],
  );

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col items-center justify-center"
      style={{
        background: "var(--se-bg)",
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
        paddingRight: "max(1.5rem, env(safe-area-inset-right))",
      }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[32px] font-medium tracking-[-0.04em] text-[var(--se-fg)]">
            SimplyEdit
          </h1>
          <p
            className="max-w-[14rem] text-[16px] leading-snug"
            style={{ color: "var(--se-muted)" }}
          >
            Photos and edits never leave this device.
          </p>
        </header>

        {isBusy ? (
          <div role="status" className="flex flex-col items-center gap-3 py-8">
            <Spinner size={28} decorative />
            <p className="text-[16px]" style={{ color: "var(--se-muted)" }}>
              {busy}
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-5">
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
            <Button
              variant="primary"
              size="lg"
              className="w-full max-w-xs rounded-lg font-medium"
              onClick={() => inputRef.current?.click()}
            >
              Open photo
            </Button>
            <div
              className={`hidden min-h-20 w-full items-center justify-center rounded-lg border border-dashed text-[14px] transition-colors md:flex ${
                dragging
                  ? "border-[var(--se-fg)]/40 bg-[var(--se-hover)] text-[var(--se-fg)]"
                  : "border-[var(--se-hairline)] text-[var(--se-muted)]"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleFiles(Array.from(event.dataTransfer.files));
              }}
            >
              Or drop a photo here
            </div>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="text-center text-[16px]"
            style={{ color: "var(--se-danger)" }}
          >
            {error}
          </p>
        ) : null}

        {hasDraft && onRestoreDraft && !isBusy ? (
          <button
            type="button"
            className="min-h-11 text-[16px] font-medium text-[var(--se-muted)] underline-offset-4 transition-colors hover:text-[var(--se-fg)] hover:underline"
            onClick={onRestoreDraft}
          >
            Continue last edit
          </button>
        ) : null}

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
  );
}
