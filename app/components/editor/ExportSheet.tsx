"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { BottomSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RangeSlider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import type {
  CropState,
  ExportDimensions,
  ExportOptions,
  SaveDelivery,
} from "@/app/lib/editor/types";
import {
  constrainExportDimensions,
  requestedExportDimensions,
} from "@/app/lib/image/geometry";
import {
  describeExportCeiling,
  exportMemoryCap,
} from "@/app/lib/render/exportLimits";

export interface ExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions, delivery: SaveDelivery) => void;
  progress: number | null;
  cancelling?: boolean;
  onCancelExport?: () => void;
  sourceWidth: number;
  sourceHeight: number;
  crop: CropState;
  sourceMimeType?: string;
  getExportDimensions?: (options: ExportOptions) => ExportDimensions | null;
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
const MUTED = "text-muted";
const subscribeToClient = () => () => {};

function radioKeyNav<T>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: { value: T }[],
  current: T,
  setValue: (value: T) => void,
) {
  const index = options.findIndex((option) => option.value === current);
  if (index < 0) return;
  let nextIndex: number;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (index + 1) % options.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (index - 1 + options.length) % options.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = options.length - 1;
  } else {
    return;
  }
  event.preventDefault();
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
      className={cn(
        "min-h-11 flex-1 rounded-control border border-hairline text-label font-medium transition-[color,background-color,box-shadow,scale] duration-150 ease-out not-disabled:hover:bg-hover not-disabled:active:scale-[0.96] disabled:opacity-40",
        active
          ? "bg-selected text-active shadow-[0_0_0_1px_var(--color-fg)]"
          : "text-muted",
      )}
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
  const stopButtonRef = useRef<HTMLButtonElement>(null);

  // Starting a save unmounts the button that was just activated, which would
  // otherwise drop focus to the document body mid-export.
  useEffect(() => {
    if (exporting) stopButtonRef.current?.focus();
  }, [exporting]);
  const canShareFiles = useSyncExternalStore(
    subscribeToClient,
    () => typeof navigator.share === "function",
    () => false,
  );

  const dimensions = useMemo(() => {
    const options: ExportOptions = { format, quality, size };
    return (
      getExportDimensions?.(options) ??
      // Renderer not up yet: same ceilings it would apply, minus the GPU's
      // own texture limit, so the number here does not jump once it is.
      constrainExportDimensions(
        requestedExportDimensions(sourceWidth, sourceHeight, crop, size),
        8192,
        exportMemoryCap(),
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

  const startExport = (delivery: SaveDelivery) =>
    onExport(
      { format, quality: format === "image/png" ? 1 : quality, size },
      delivery,
    );

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
      title={canShareFiles ? "Share photo" : "Save photo"}
      description="Choose how this photo is saved."
      className="border-hairline bg-surface text-fg"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3
            className={`text-caption font-medium uppercase tracking-label ${MUTED}`}
          >
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
            <p className={`text-label ${MUTED}`}>
              JPEG has no transparency — transparent areas become white.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h3
            className={`text-caption font-medium uppercase tracking-label ${MUTED}`}
          >
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
                onKeyDown={(event) => radioKeyNav(event, SIZES, size, setSize)}
              />
            ))}
          </div>
          <p className={`text-label tabular-nums whitespace-nowrap ${MUTED}`}>
            {dimensions.actual.width} × {dimensions.actual.height}&nbsp;px
          </p>
          {dimensions.reduced ? (
            <p className={`text-label text-pretty ${MUTED}`}>
              Reduced from {dimensions.requested.width} ×{" "}
              {dimensions.requested.height} px.{" "}
              {describeExportCeiling(dimensions)}
            </p>
          ) : null}
        </section>

        {format !== "image/png" ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3
                className={`text-caption font-medium uppercase tracking-label ${MUTED}`}
              >
                Quality
              </h3>
              <span className={`tabular-nums text-label font-medium ${MUTED}`}>
                {Math.round(quality * 100)}%
              </span>
            </div>
            <RangeSlider
              value={quality}
              min={0.5}
              max={1}
              step={0.01}
              disabled={exporting}
              aria-label="Quality"
              onValueChange={setQuality}
            />
          </section>
        ) : null}

        {exporting ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Spinner size={28} decorative />
            <p role="status" className={`text-body tabular-nums ${MUTED}`}>
              {cancelling
                ? "Cancelling…"
                : `Saving… ${Math.round((progress ?? 0) * 100)}%`}
            </p>
            {onCancelExport && !cancelling ? (
              <Button
                ref={stopButtonRef}
                variant="ghost"
                size="md"
                className={MUTED}
                onClick={onCancelExport}
              >
                Stop saving
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full rounded-control font-medium"
              onClick={() => startExport(canShareFiles ? "share" : "download")}
            >
              {canShareFiles ? "Share" : "Download"}
            </Button>
            {/* Sharing is the phone-shaped default, but it is a detour when
                what someone wants is the file in their downloads — and on
                Android the share sheet was the only way out. */}
            {canShareFiles ? (
              <Button
                variant="ghost"
                size="lg"
                className="w-full rounded-control border border-hairline font-medium"
                onClick={() => startExport("download")}
              >
                Download
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="md"
              className="w-full text-muted"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
