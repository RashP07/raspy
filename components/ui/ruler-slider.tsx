"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { playSliderTick, unlockTickAudio } from "@/app/lib/audio/tick";
import { cn } from "@/lib/utils";

/** Pixel distance between adjacent minor ticks on the tape. */
const TICK_PX = 9;

export interface RulerSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  className?: string;
  /** Emphasized value the tape snaps a bold tick to (usually 0). */
  origin?: number;
  /** Play a soft tick while scrubbing. Default true. */
  sound?: boolean;
  /** Map a tape value to its printed label. Defaults to trimmed decimals. */
  formatLabel?: (value: number) => string;
  "aria-label"?: string;
  onValueChange?: (value: number) => void;
}

function decimalsOf(step: number): number {
  const text = `${step}`;
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function isNice(x: number): boolean {
  if (x <= 0) return false;
  const mantissa = x / Math.pow(10, Math.floor(Math.log10(x)));
  return [1, 2, 2.5, 5].some((m) => Math.abs(mantissa - m) < 1e-9);
}

/** Densest nice interval that keeps the tape under ~48 minor ticks. */
function pickMinorInterval(span: number): number {
  const options = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
  for (const option of options) {
    if (span / option <= 48) return option;
  }
  return options[options.length - 1];
}

function defaultFormatLabel(value: number): string {
  return `${Math.round(value * 100) / 100}`;
}

export function RulerSlider({
  value,
  min,
  max,
  step,
  disabled,
  className,
  origin,
  sound = true,
  formatLabel = defaultFormatLabel,
  "aria-label": ariaLabel,
  onValueChange,
}: RulerSliderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    value: number;
  } | null>(null);
  const lastUnitRef = useRef(0);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const span = Math.max(max - min, 1e-6);
  const stepDecimals = decimalsOf(step);
  const minorInterval = useMemo(() => pickMinorInterval(span), [span]);
  const majorInterval = useMemo(() => {
    const five = minorInterval * 5;
    return isNice(five) ? five : minorInterval * 4;
  }, [minorInterval]);

  const ticks = useMemo(() => {
    const start = Math.ceil((min - 1e-9) / minorInterval) * minorInterval;
    const count = Math.floor((max - start) / minorInterval + 1e-9);
    const majorCount = Math.floor(span / majorInterval) + 1;
    const labelStride = majorCount > 9 ? 2 : 1;
    const out: { value: number; major: boolean; label: string | null }[] = [];
    for (let i = 0; i <= count; i += 1) {
      const raw = start + i * minorInterval;
      const tickValue = Number(raw.toFixed(6));
      const majorIndex = tickValue / majorInterval;
      const isMajor = Math.abs(majorIndex - Math.round(majorIndex)) < 1e-6;
      const labelled = isMajor && Math.round(majorIndex) % labelStride === 0;
      out.push({
        value: tickValue,
        major: isMajor,
        label: labelled ? formatLabel(tickValue) : null,
      });
    }
    return out;
  }, [min, max, span, minorInterval, majorInterval, formatLabel]);

  const tapeWidth = (span / minorInterval) * TICK_PX;
  const xOf = (v: number) => ((v - min) / span) * tapeWidth;
  const offset = width / 2 - xOf(value);

  const changeTo = (raw: number) => {
    const clamped = Math.min(max, Math.max(min, raw));
    const snapped = Number(
      (Math.round(clamped / step) * step).toFixed(stepDecimals),
    );
    if (snapped === value) return;
    if (sound) {
      const unit = Math.round(snapped / minorInterval);
      if (unit !== lastUnitRef.current) {
        const originUnit =
          origin !== undefined ? Math.round(origin / minorInterval) : null;
        playSliderTick({ accent: originUnit !== null && unit === originUnit });
        lastUnitRef.current = unit;
      }
    }
    onValueChange?.(snapped);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, value };
    lastUnitRef.current = Math.round(value / minorInterval);
    if (sound) unlockTickAudio();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    changeTo(drag.value - dx * (minorInterval / TICK_PX));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = value + step;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = value - step;
    } else if (event.key === "PageUp") {
      next = value + majorInterval;
    } else if (event.key === "PageDown") {
      next = value - majorInterval;
    } else if (event.key === "Home") {
      next = origin !== undefined ? origin : min;
    } else if (event.key === "End") {
      next = max;
    }
    if (next === null) return;
    event.preventDefault();
    if (sound) unlockTickAudio();
    changeTo(next);
  };

  return (
    <div
      ref={rootRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={formatLabel(value)}
      aria-disabled={disabled || undefined}
      className={cn(
        "se-ruler",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={origin !== undefined ? () => changeTo(origin) : undefined}
    >
      <div
        className="se-ruler-tape"
        style={{
          width: `${tapeWidth}px`,
          transform: `translate3d(${offset}px, 0, 0)`,
        }}
        aria-hidden
      >
        {ticks.map((tick) => (
          <span key={tick.value} style={{ left: `${xOf(tick.value)}px` }}>
            {tick.label !== null ? (
              <span className="se-ruler-label">{tick.label}</span>
            ) : null}
            <span
              className={cn(
                "se-ruler-tick",
                tick.major && "se-ruler-tick-major",
                origin !== undefined &&
                  Math.abs(tick.value - origin) < 1e-9 &&
                  "se-ruler-tick-origin",
              )}
            />
          </span>
        ))}
      </div>
      <div className="se-ruler-center" aria-hidden />
      <div className="se-ruler-arrow" aria-hidden />
    </div>
  );
}
