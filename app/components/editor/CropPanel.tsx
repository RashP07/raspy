"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  FlipHorizontalIcon,
  FlipVerticalIcon,
  ResetCropIcon,
  RotateIcon,
} from "@/components/ui/icons";
import { RulerSlider } from "@/components/ui/ruler-slider";
import type { AspectRatio, CropState } from "@/app/lib/editor/types";
import {
  aspectValue,
  clampStraighten,
  fitAspectBounds,
  nextRotation,
  rotateAspect,
} from "@/app/lib/image/crop";

const PRIMARY_ASPECTS: { value: AspectRatio; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "original", label: "Original" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "16:9", label: "16:9" },
];

const CROP_TOOLS = [
  { value: "frame" as const, label: "Aspect" },
  { value: "straighten" as const, label: "Straighten" },
];

function moveRadioIndex(
  current: number,
  length: number,
  key: string,
): number | null {
  if (length <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (current + 1) % length;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (current - 1 + length) % length;
  }
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

export interface CropPanelProps {
  crop: CropState;
  sourceWidth: number;
  sourceHeight: number;
  onChange: (crop: Partial<CropState>, coalesce?: boolean) => void;
  onReset: () => void;
  onCommit?: () => void;
  onStraightenStart?: () => void;
  onStraightenEnd?: () => void;
}

export function CropPanel({
  crop,
  sourceWidth,
  sourceHeight,
  onChange,
  onReset,
  onCommit,
  onStraightenStart,
  onStraightenEnd,
}: CropPanelProps) {
  const [activeTool, setActiveTool] = useState<"frame" | "straighten">("frame");

  const aspectOptions = useMemo(() => {
    if (PRIMARY_ASPECTS.some((option) => option.value === crop.aspect)) {
      return PRIMARY_ASPECTS;
    }
    return [...PRIMARY_ASPECTS, { value: crop.aspect, label: crop.aspect }];
  }, [crop.aspect]);

  const setAspect = (aspect: AspectRatio) => {
    const ratio = aspectValue(aspect, sourceWidth, sourceHeight, crop.rotation);
    if (ratio === null) {
      onChange({ aspect }, false);
      return;
    }
    onChange(
      {
        aspect,
        bounds: fitAspectBounds(
          ratio,
          sourceWidth,
          sourceHeight,
          crop.rotation,
          crop.bounds,
        ),
      },
      false,
    );
  };

  const handleToolKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = CROP_TOOLS.findIndex((t) => t.value === activeTool);
    const nextIndex = moveRadioIndex(
      currentIndex,
      CROP_TOOLS.length,
      event.key,
    );
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveTool(CROP_TOOLS[nextIndex].value);
    const radios =
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[nextIndex]?.focus();
  };

  const handleAspectKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = aspectOptions.findIndex(
      (option) => option.value === crop.aspect,
    );
    const nextIndex = moveRadioIndex(
      Math.max(0, currentIndex),
      aspectOptions.length,
      event.key,
    );
    if (nextIndex === null) return;
    event.preventDefault();
    setAspect(aspectOptions[nextIndex].value);
    const radios =
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[nextIndex]?.focus();
  };

  return (
    <div
      className="se-crop-panel"
      style={{
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="se-control text-[var(--se-fg)]"
            aria-label="Rotate right 90 degrees"
            onClick={() =>
              onChange(
                {
                  rotation: nextRotation(crop.rotation),
                  aspect: rotateAspect(crop.aspect),
                },
                false,
              )
            }
          >
            <RotateIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="se-control text-[var(--se-fg)]"
            aria-label="Flip horizontal"
            onClick={() => onChange({ flipX: !crop.flipX }, false)}
          >
            <FlipHorizontalIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="se-control text-[var(--se-fg)]"
            aria-label="Flip vertical"
            onClick={() => onChange({ flipY: !crop.flipY }, false)}
          >
            <FlipVerticalIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="se-control text-[var(--se-muted)]"
            aria-label="Reset crop"
            onClick={onReset}
          >
            <ResetCropIcon />
          </Button>
        </div>
        <div
          role="radiogroup"
          aria-label="Crop tool"
          className="flex items-center gap-1"
          onKeyDown={handleToolKeyDown}
        >
          {CROP_TOOLS.map((tool) => {
            const active = activeTool === tool.value;
            return (
              <button
                key={tool.value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTool(tool.value)}
                className="min-h-10 rounded-lg px-3 text-[14px] font-medium transition-[color,background-color,scale] duration-150 ease-out hover:bg-[var(--se-hover)] active:scale-[0.96]"
                style={{
                  color: active ? "var(--se-active)" : "var(--se-muted)",
                }}
              >
                {tool.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTool === "frame" ? (
        <div
          className="se-bleed-inset scrollbar-none flex gap-1 overflow-x-auto py-1"
          role="radiogroup"
          aria-label="Aspect ratio"
          onKeyDown={handleAspectKeyDown}
        >
          {aspectOptions.map((option) => {
            const active = crop.aspect === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setAspect(option.value)}
                className="min-h-10 shrink-0 rounded-lg px-3 text-[14px] font-medium transition-[color,background-color,scale] duration-150 ease-out hover:bg-[var(--se-hover)] active:scale-[0.96]"
                style={{
                  color: active ? "var(--se-active)" : "var(--se-muted)",
                  background: active ? "var(--se-selected-bg)" : "transparent",
                  border: active
                    ? "1px solid var(--se-hairline)"
                    : "1px solid transparent",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--se-fg)]">
              Straighten
            </span>
            <span
              className="tabular-nums text-[14px] font-medium"
              style={{
                color:
                  crop.straighten === 0
                    ? "var(--se-muted)"
                    : "var(--se-active)",
              }}
            >
              {crop.straighten > 0 ? "+" : ""}
              {Math.round(crop.straighten)}°
            </span>
          </div>
          <div
            onPointerDown={onStraightenStart}
            onPointerUp={() => {
              onStraightenEnd?.();
              onCommit?.();
            }}
            onPointerCancel={() => {
              onStraightenEnd?.();
              onCommit?.();
            }}
          >
            <RulerSlider
              value={crop.straighten}
              min={-45}
              max={45}
              step={0.5}
              origin={0}
              aria-label="Straighten"
              onValueChange={(next) => {
                onChange({ straighten: clampStraighten(next) }, true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
