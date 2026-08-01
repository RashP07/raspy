"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { BottomSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import type {
  CropState,
  ExportDimensions,
  ExportOptions,
} from "@/app/lib/editor/types";
import {
  constrainExportDimensions,
  requestedExportDimensions,
} from "@/app/lib/image/geometry";

export interface ExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  progress: number | null;
  cancelling?: boolean;
  onCancelExport?: () => void;
  sourceWidth: number;
  sourceHeight: number;
  crop: CropState;
  sourceMimeType?: string;
  getExportDimensions?: (
    options: ExportOptions,
  ) => ExportDimensions | null;
}

type FormatOption = ExportOptions["format"];
type SizeOption = ExportOptions["size"];

const FORMATS: { value: FormatOption; label: string }[] = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

const SIZES: { value: SizeOption; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "75-percent", label: "75%" },
  { value: "50-percent", label: "50%" },
];
const MUTED = "text-[var(--se-muted)]";
const subscribeToClient = () => () => {};

function radioKeyNav<T>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: { value: T }[],
  current: T,
  setValue: (value: T) => void,
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const index = options.findIndex((option) => option.value === current);
  if (index < 0) return;
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const nextIndex = (index + delta + options.length) % options.length;
  setValue(options[nextIndex]!.value);
  const radios =
    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
      '[role="radio"]',
    );
  radios?.[nextIndex]?.focus();
}

function OptionChip({
  active,
  disabled,
  label,
  onClick,
  onKeyDown,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="min-h-10 flex-1 rounded-md text-[14px] font-medium transition-colors disabled:opacity-50"
      style={{
        color: active ? "var(--se-active)" : "var(--se-muted)",
        background: active ? "var(--se-selected-bg)" : "transparent",
        border: active
          ? "1px solid var(--se-hairline)"
          : "1px solid var(--se-hairline)",
      }}
    >
      {label}
    </button>
  );
}

export function ExportSheet({
  open,
  onOpenChange,
  onExport,
  progress,
  cancelling = false,
  onCancelExport,
  sourceWidth,
  sourceHeight,
  crop,
  sourceMimeType,
  getExportDimensions,
}: ExportSheetProps) {
  const [format, setFormat] = useState<FormatOption>("image/jpeg");
  const [size, setSize] = useState<SizeOption>("original");
  const [quality, setQuality] = useState(0.92);
  const exporting = progress !== null;
  const canShareFiles = useSyncExternalStore(
    subscribeToClient,
    () => typeof navigator.share === "function",
    () => false,
  );

  const dimensions = useMemo(() => {
    const options: ExportOptions = { format, quality, size };
    return (
      getExportDimensions?.(options) ??
      constrainExportDimensions(
        requestedExportDimensions(sourceWidth, sourceHeight, crop, size),
        8192,
      )
    );
  }, [
    sourceWidth,
    sourceHeight,
    crop,
    size,
    format,
    quality,
    getExportDimensions,
  ]);

  const showJpegAlphaWarning =
    format === "image/jpeg" &&
    (sourceMimeType === "image/png" || sourceMimeType === "image/webp");

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (exporting) return;
        onOpenChange(next);
      }}
      title="Save"
      description="Format, quality, and size."
      className="border-[var(--se-hairline)] bg-[var(--se-surface)] text-[var(--se-fg)]"
    >
      <div
        className="flex flex-col gap-5 pb-[env(safe-area-inset-bottom)]"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <section className="flex flex-col gap-2">
          <h3 className={`text-[12px] font-medium uppercase tracking-wide ${MUTED}`}>
            Format
          </h3>
          <div role="radiogroup" aria-label="Format" className="flex gap-2">
            {FORMATS.map((option) => (
              <OptionChip
                key={option.value}
                active={format === option.value}
                disabled={exporting}
                label={option.label}
                onClick={() => setFormat(option.value)}
                onKeyDown={(event) =>
                  radioKeyNav(event, FORMATS, format, setFormat)
                }
              />
            ))}
          </div>
          {showJpegAlphaWarning ? (
            <p className={`text-[13px] ${MUTED}`}>
              JPEG has no transparency — transparent areas become white.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={`text-[12px] font-medium uppercase tracking-wide ${MUTED}`}>
            Size
          </h3>
          <div role="radiogroup" aria-label="Size" className="flex gap-2">
            {SIZES.map((option) => (
              <OptionChip
                key={option.value}
                active={size === option.value}
                disabled={exporting}
                label={option.label}
                onClick={() => setSize(option.value)}
                onKeyDown={(event) =>
                  radioKeyNav(event, SIZES, size, setSize)
                }
              />
            ))}
          </div>
          <p className={`text-[13px] ${MUTED}`}>
            {dimensions.actual.width} × {dimensions.actual.height} px
          </p>
          {dimensions.reduced ? (
            <p className={`text-[13px] ${MUTED}`}>
              Reduced from {dimensions.requested.width} ×{" "}
              {dimensions.requested.height} for safe export on this device.
            </p>
          ) : null}
        </section>

        {format !== "image/png" ? (
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h3
                className={`text-[12px] font-medium uppercase tracking-wide ${MUTED}`}
              >
                Quality
              </h3>
              <span className={`tabular-nums text-[13px] font-medium ${MUTED}`}>
                {Math.round(quality * 100)}%
              </span>
            </div>
            <RangeSlider
              value={quality}
              min={0.5}
              max={1}
              step={0.01}
              disabled={exporting}
              aria-label="Export quality"
              onValueChange={setQuality}
            />
          </section>
        ) : null}

        {exporting ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Spinner size={28} label="Saving" />
            <p className={`text-[15px] ${MUTED}`}>
              {cancelling
                ? "Cancelling…"
                : `Saving… ${Math.round((progress ?? 0) * 100)}%`}
            </p>
            {onCancelExport && !cancelling ? (
              <Button
                variant="ghost"
                size="sm"
                className={`min-h-11 text-[15px] ${MUTED}`}
                onClick={onCancelExport}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              size="lg"
              className="min-h-12 w-full rounded-lg text-[16px] font-medium"
              onClick={() =>
                onExport({
                  format,
                  quality: format === "image/png" ? 1 : quality,
                  size,
                })
              }
            >
              {canShareFiles ? "Share" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="min-h-11 w-full text-[15px] text-[var(--se-muted)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
