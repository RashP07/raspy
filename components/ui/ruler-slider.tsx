"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { playSliderTick, unlockTickAudio } from "@/app/lib/audio/tick";
import { cn } from "@/lib/utils";

/** Pixels a full min..max sweep should take, regardless of step granularity.
 *  Tick spacing derives from this so coarse-stepped ranges (exposure: 80 ticks)
 *  aren't several times more drag-sensitive than fine ones (200 ticks). */
const RANGE_TRAVEL_PX = 1200;

/** How far either side of the indicator the swell reaches, in pixels. */
const SWELL_PX = 62;

/** Quiet time after the last change before the tape settles flat again. */
const SETTLE_MS = 420;

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
  const [wave, setWave] = useState<{ active: boolean; dir: 1 | -1 }>({
    active: false,
    dir: 1,
  });
  const scrubTimerRef = useRef<number | null>(null);

  /** Only ever called from a real value change, so a tap alone stays flat. */
  const markScrubbing = (dir: 1 | -1) => {
    setWave({ active: true, dir });
    if (scrubTimerRef.current !== null) {
      window.clearTimeout(scrubTimerRef.current);
    }
    scrubTimerRef.current = window.setTimeout(
      () => setWave((prev) => ({ ...prev, active: false })),
      SETTLE_MS,
    );
  };

  useEffect(
    () => () => {
      if (scrubTimerRef.current !== null) {
        window.clearTimeout(scrubTimerRef.current);
      }
    },
    [],
  );

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
  // Every reachable value gets its own tick.
  const minorInterval = step;
  const majorInterval = useMemo(() => {
    const five = minorInterval * 5;
    return isNice(five) ? five : minorInterval * 4;
  }, [minorInterval]);

  const ticks = useMemo(() => {
    const start = Math.ceil((min - 1e-9) / minorInterval) * minorInterval;
    const count = Math.floor((max - start) / minorInterval + 1e-9);
    const out: { value: number; major: boolean }[] = [];
    for (let i = 0; i <= count; i += 1) {
      const raw = start + i * minorInterval;
      const tickValue = Number(raw.toFixed(6));
      const majorIndex = tickValue / majorInterval;
      out.push({
        value: tickValue,
        major: Math.abs(majorIndex - Math.round(majorIndex)) < 1e-6,
      });
    }
    return out;
  }, [min, max, minorInterval, majorInterval]);

  /* One tick per step, so the indicator always lands on a tick rather than in
     the gap between two; spacing clamped so tapes stay legible. */
  const tickPx = Math.min(
    14,
    Math.max(4, (RANGE_TRAVEL_PX * minorInterval) / span),
  );
  const tapeWidth = (span / minorInterval) * tickPx;
  const xOf = (v: number) => ((v - min) / span) * tapeWidth;
  const offset = width / 2 - xOf(value);

  /* A tick per step can mean hundreds of them; only the ones that can reach the
     viewport are worth rendering. */
  const halfWindow = width / 2 + tickPx * 8;
  const visibleTicks = ticks.filter(
    (tick) => Math.abs(xOf(tick.value) - xOf(value)) <= halfWindow,
  );

  /**
   * While scrubbing, ticks swell as they pass under the indicator and settle
   * again behind it, so the emphasis is a travelling wave rather than a fill
   * that stays put. At rest the tape is uniform: how far you are from zero is
   * communicated by the origin dot's distance from the indicator, not by tick
   * height.
   *
   * Transitions live on transform/opacity so the wave animates on the
   * compositor instead of relaying out ~45 elements every frame.
   */
  const emphasisOf = (tickValue: number, major: boolean) => {
    const rest = major
      ? { scale: 0.46, opacity: 0.42 }
      : { scale: 0.34, opacity: 0.22 };
    if (!wave.active) return rest;
    // Positive delta sits right of the indicator. Raising the value sweeps the
    // tape leftwards, so the wake is the ticks that already went past — the
    // side opposite the oncoming ones. Ticks ahead of the indicator stay flat.
    const delta = xOf(tickValue) - xOf(value);
    const trailing = wave.dir > 0 ? delta <= 0 : delta >= 0;
    if (!trailing) return rest;
    const falloff = Math.max(0, 1 - Math.abs(delta) / SWELL_PX);
    const eased = falloff * falloff * (3 - 2 * falloff);
    // Interpolate each tick between its own rest and its own peak. Adding a
    // flat amount instead would clip majors against the ceiling first, so they
    // would finish travelling early and read as leading the minors.
    const peak = major
      ? { scale: 1, opacity: 1 }
      : { scale: 0.82, opacity: 0.8 };
    return {
      scale: rest.scale + (peak.scale - rest.scale) * eased,
      opacity: rest.opacity + (peak.opacity - rest.opacity) * eased,
    };
  };

  const changeTo = (raw: number) => {
    const clamped = Math.min(max, Math.max(min, raw));
    const snapped = Number(
      (Math.round(clamped / step) * step).toFixed(stepDecimals),
    );
    if (snapped === value) return;
    markScrubbing(snapped > value ? 1 : -1);
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
    changeTo(drag.value - dx * (minorInterval / tickPx));
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
      data-scrubbing={wave.active || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={origin !== undefined ? () => changeTo(origin) : undefined}
    >
      <div className="se-ruler-mask" aria-hidden>
        <div
          className="se-ruler-tape"
          style={{
            width: `${tapeWidth}px`,
            transform: `translate3d(${offset}px, 0, 0)`,
          }}
        >
          {origin !== undefined ? (
            <span
              className="se-ruler-origin"
              style={{ left: `${xOf(origin)}px` }}
            />
          ) : null}
          {visibleTicks.map((tick) => {
            const { scale, opacity } = emphasisOf(tick.value, tick.major);
            return (
              <span
                key={tick.value}
                className="se-ruler-tick"
                style={
                  {
                    left: `${xOf(tick.value)}px`,
                    "--tick-scale": scale,
                    "--tick-opacity": opacity,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      </div>
      <div className="se-ruler-center" aria-hidden />
    </div>
  );
}
