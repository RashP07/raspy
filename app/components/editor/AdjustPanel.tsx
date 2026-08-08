"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { RulerSlider } from "@/components/ui/ruler-slider";
import { playSelect, unlockTickAudio } from "@/app/lib/audio/tick";
import { ADJUSTMENT_ICONS } from "@/components/ui/icons";
import {
  ADJUSTMENT_KEYS,
  ADJUSTMENT_META,
  NO_WEBGL_MESSAGE,
  type AdjustmentKey,
} from "@/app/lib/editor/types";

export interface AdjustPanelProps {
  activeKey: AdjustmentKey;
  values: Record<AdjustmentKey, number>;
  hasWebGL: boolean;
  onSelect: (key: AdjustmentKey) => void;
  onChange: (key: AdjustmentKey, value: number) => void;
  onReset: (key: AdjustmentKey) => void;
  onCommit?: () => void;
}

function formatValue(key: AdjustmentKey, value: number): string {
  const meta = ADJUSTMENT_META[key];
  if (meta.step < 1) {
    const rounded = Math.round(value * 100) / 100;
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }
  const n = Math.round(value);
  return n > 0 ? `+${n}` : `${n}`;
}

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

function dialProgress(key: AdjustmentKey, value: number): number {
  const meta = ADJUSTMENT_META[key];
  const span = Math.max(Math.abs(meta.min), Math.abs(meta.max), 0.0001);
  return Math.min(1, Math.abs(value) / span);
}

export function AdjustPanel({
  activeKey,
  values,
  hasWebGL,
  onSelect,
  onChange,
  onReset,
  onCommit,
}: AdjustPanelProps) {
  const meta = ADJUSTMENT_META[activeKey];
  const value = values[activeKey];
  const disabled = !hasWebGL;
  const chipRefs = useRef(new Map<AdjustmentKey, HTMLButtonElement>());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const visibleKeys = ADJUSTMENT_KEYS;

  // Fades mark the edges that still hide dials, so the row reads as scrollable.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // An explicit behavior option wins over the reduced-motion CSS reset.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    chipRefs.current.get(activeKey)?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeKey]);

  const handleChipKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const nextIndex = moveRadioIndex(
      visibleKeys.indexOf(activeKey),
      visibleKeys.length,
      event.key,
    );
    if (nextIndex === null) return;
    event.preventDefault();
    const nextKey = visibleKeys[nextIndex];
    onSelect(nextKey);
    const radios =
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[nextIndex]?.focus();
  };

  return (
    <div
      className="se-adjust-panel"
      style={{
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {!hasWebGL ? (
        <p
          className="pb-2 text-center text-[12px]"
          style={{
            color: "var(--se-muted)",
            borderBottom: "1px solid var(--se-hairline)",
          }}
        >
          {NO_WEBGL_MESSAGE}
        </p>
      ) : null}

      <div
        ref={scrollerRef}
        className="se-chip-scroller se-bleed scrollbar-none flex snap-x snap-proximity overflow-x-auto py-1"
        data-overflow-start={edges.start || undefined}
        data-overflow-end={edges.end || undefined}
      >
        <div
          className="se-chip-track flex gap-1"
          role="radiogroup"
          aria-label="Adjustments"
          onKeyDown={handleChipKeyDown}
        >
          {visibleKeys.map((key) => {
            const active = key === activeKey;
            const adjusted = values[key] !== 0;
            const label = ADJUSTMENT_META[key].label;
            const progress = dialProgress(key, values[key]);
            const Icon = ADJUSTMENT_ICONS[key];
            return (
              <button
                key={key}
                ref={(node) => {
                  if (node) chipRefs.current.set(key, node);
                  else chipRefs.current.delete(key);
                }}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={
                  active && adjusted
                    ? `Reset ${label}, currently ${formatValue(key, values[key])}`
                    : adjusted
                      ? `${label}, ${formatValue(key, values[key])}`
                      : label
                }
                tabIndex={active ? 0 : -1}
                disabled={disabled}
                onClick={() => {
                  unlockTickAudio();
                  playSelect();
                  if (active && adjusted) onReset(key);
                  else onSelect(key);
                }}
                className="flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-xl p-1 text-center transition-[color,scale] duration-150 ease-out not-disabled:active:scale-[0.97] disabled:opacity-40"
              >
                <AdjustmentDial
                  active={active}
                  progress={progress}
                  adjusted={adjusted}
                >
                  {active ? (
                    <span className="se-dial-value">
                      {formatValue(key, values[key])}
                    </span>
                  ) : (
                    <Icon />
                  )}
                </AdjustmentDial>
                <span
                  // Two 14px lines, reserved up front so a wrapping label
                  // ("Noise Reduction") does not shove its neighbours up. Fixed
                  // px rather than em/unitless leading: 2.2em of an 11px font
                  // resolved to 24.2px, which is a seam on any 1x display.
                  className="flex min-h-[28px] items-start justify-center text-[12px] leading-[14px] transition-colors"
                  style={{
                    color: active ? "var(--se-fg)" : "var(--se-muted)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div onPointerUp={onCommit} onPointerCancel={onCommit} onKeyUp={onCommit}>
        <RulerSlider
          value={value}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          disabled={disabled}
          origin={0}
          aria-label={meta.label}
          onValueChange={(next) => {
            onChange(activeKey, next);
          }}
        />
      </div>
    </div>
  );
}

function AdjustmentDial({
  active,
  progress,
  adjusted,
  children,
}: {
  active: boolean;
  progress: number;
  adjusted: boolean;
  children: ReactNode;
}) {
  // Half the 2px stroke sits either side of this, so r = 26 - 1 lands the ring
  // exactly on the dial's 2px border instead of straddling a half pixel.
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  return (
    <span
      className="se-dial"
      data-active={active || undefined}
      aria-hidden
      style={{
        color: active || adjusted ? "var(--se-fg)" : "var(--se-muted)",
      }}
    >
      {progress > 0.01 ? (
        <svg className="se-dial-ring" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="var(--se-fg)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
      ) : null}
      <span className="se-dial-icon">{children}</span>
    </span>
  );
}
