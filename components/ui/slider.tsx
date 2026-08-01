"use client";

import { useEffect, useMemo, useRef } from "react";
import { Slider } from "@base-ui/react/slider";
import { playSliderTick, unlockTickAudio } from "@/app/lib/audio/tick";
import { cn } from "@/lib/utils";

export interface RangeSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** Draw vertical tick marks inside the well. Default true. */
  ticks?: boolean;
  /** Play a soft tick on each step change. Default true. */
  sound?: boolean;
  /** Emphasize this value as a taller origin tick when in range. */
  origin?: number;
  "aria-label"?: string;
  onValueChange?: (value: number) => void;
}

function stepIndex(value: number, min: number, step: number): number {
  return Math.round((value - min) / step);
}

function buildTickMarks(
  min: number,
  max: number,
  step: number,
  origin: number | undefined,
  maxMarks: number,
): { value: number; major: boolean }[] {
  const span = max - min;
  if (span <= 0 || step <= 0) return [];

  const totalSteps = Math.max(1, Math.round(span / step));
  const stride = Math.max(1, Math.ceil(totalSteps / Math.max(2, maxMarks - 1)));
  const marks: { value: number; major: boolean }[] = [];
  const seen = new Set<number>();

  const push = (raw: number, major: boolean) => {
    const clamped = Math.min(max, Math.max(min, raw));
    const key = Math.round(clamped / step);
    if (seen.has(key)) {
      if (major) {
        const existing = marks.find((m) => Math.round(m.value / step) === key);
        if (existing) existing.major = true;
      }
      return;
    }
    seen.add(key);
    marks.push({ value: clamped, major });
  };

  for (let i = 0; i <= totalSteps; i += stride) {
    push(min + i * step, i === 0 || i + stride > totalSteps);
  }
  push(max, true);
  if (origin !== undefined && origin >= min && origin <= max) {
    push(origin, true);
  }

  return marks.sort((a, b) => a.value - b.value);
}

export function RangeSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  ticks = true,
  sound = true,
  origin,
  "aria-label": ariaLabel,
  onValueChange,
}: RangeSliderProps) {
  const lastIndexRef = useRef(stepIndex(value, min, step));

  useEffect(() => {
    lastIndexRef.current = stepIndex(value, min, step);
  }, [value, min, step]);

  const marks = useMemo(
    () => (ticks ? buildTickMarks(min, max, step, origin, 21) : []),
    [ticks, min, max, step, origin],
  );

  const showOrigin =
    origin !== undefined && origin > min && origin < max;

  const handleChange = (nextRaw: number | number[]) => {
    const next = typeof nextRaw === "number" ? nextRaw : (nextRaw[0] ?? value);
    const nextIndex = stepIndex(next, min, step);
    if (sound && nextIndex !== lastIndexRef.current) {
      const originIndex =
        showOrigin && origin !== undefined
          ? stepIndex(origin, min, step)
          : null;
      const crossedOrigin =
        originIndex !== null && nextIndex === originIndex;
      playSliderTick({ accent: crossedOrigin });
    }
    lastIndexRef.current = nextIndex;
    onValueChange?.(next);
  };

  return (
    <div
      className={cn("se-slider-well", disabled && "opacity-40", className)}
      onPointerDown={() => {
        if (disabled) return;
        lastIndexRef.current = stepIndex(value, min, step);
        if (sound) unlockTickAudio();
      }}
      onKeyDown={() => {
        if (disabled) return;
        if (sound) unlockTickAudio();
      }}
    >
      {marks.length > 0 ? (
        <div className="se-slider-ticks" aria-hidden>
          {marks.map((mark) => {
            const pct = ((mark.value - min) / Math.max(0.0001, max - min)) * 100;
            return (
              <span
                key={`${mark.value}-${mark.major ? "m" : "n"}`}
                className={
                  mark.major ? "se-slider-tick se-slider-tick-major" : "se-slider-tick"
                }
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>
      ) : null}

      <Slider.Root
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={handleChange}
        className="relative z-10 w-full touch-none select-none"
      >
        <Slider.Control className="flex w-full items-center py-2.5">
          <Slider.Track className="relative h-[2px] w-full rounded-full bg-black/15">
            <Slider.Indicator className="rounded-full bg-[var(--se-active)]" />
            <Slider.Thumb
              aria-label={ariaLabel}
              className="size-[22px] rounded-full bg-[var(--se-active)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--se-accent)]"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
