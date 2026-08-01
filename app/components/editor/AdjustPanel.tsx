"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { RulerSlider } from "@/components/ui/ruler-slider";
import {
  ADJUSTMENT_KEYS,
  ADJUSTMENT_META,
  CORE_ADJUSTMENT_KEYS,
  MORE_ADJUSTMENT_KEYS,
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
  onResetAll: () => void;
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
  onResetAll,
  onCommit,
}: AdjustPanelProps) {
  const meta = ADJUSTMENT_META[activeKey];
  const value = values[activeKey];
  const disabled = !hasWebGL;
  const hasAnyAdjustments = ADJUSTMENT_KEYS.some((key) => values[key] !== 0);
  const moreHasEdits = MORE_ADJUSTMENT_KEYS.some((key) => values[key] !== 0);
  const [showMore, setShowMore] = useState(
    () => MORE_ADJUSTMENT_KEYS.includes(activeKey) || moreHasEdits,
  );
  const chipRefs = useRef(new Map<AdjustmentKey, HTMLButtonElement>());

  const visibleKeys = useMemo(() => {
    if (showMore) return [...CORE_ADJUSTMENT_KEYS, ...MORE_ADJUSTMENT_KEYS];
    if (MORE_ADJUSTMENT_KEYS.includes(activeKey)) {
      return [...CORE_ADJUSTMENT_KEYS, activeKey];
    }
    return CORE_ADJUSTMENT_KEYS;
  }, [activeKey, showMore]);

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
      className="se-adjust-panel flex flex-col gap-0 px-2 pb-0 pt-1"
      style={{
        color: "var(--se-fg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {!hasWebGL ? (
        <p
          className="mx-1 px-2 py-1.5 text-center text-[12px]"
          style={{
            color: "var(--se-muted)",
            borderBottom: "1px solid var(--se-hairline)",
          }}
        >
          {NO_WEBGL_MESSAGE}
        </p>
      ) : null}

      <div className="scrollbar-none flex snap-x snap-proximity gap-1 overflow-x-auto px-3 pb-1 pt-1.5">
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label="Adjustments"
          onKeyDown={handleChipKeyDown}
        >
          {visibleKeys.map((key) => {
            const active = key === activeKey;
            const adjusted = values[key] !== 0;
            const label = ADJUSTMENT_META[key].label;
            const progress = dialProgress(key, values[key]);
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
                aria-label={adjusted ? `${label}, adjusted` : label}
                tabIndex={active ? 0 : -1}
                disabled={disabled}
                onClick={() => onSelect(key)}
                className="flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-xl px-1 pb-1 pt-1.5 text-center transition-[color,background-color,scale] duration-150 ease-out not-disabled:hover:bg-black/[0.03] not-disabled:active:scale-[0.97] disabled:opacity-40"
              >
                <AdjustmentDial
                  active={active}
                  progress={progress}
                  adjusted={adjusted}
                >
                  {ADJUSTMENT_ICONS[key]}
                </AdjustmentDial>
                <span
                  className="flex min-h-[2.2em] items-start justify-center text-[11px] leading-tight transition-colors"
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
        <button
          type="button"
          aria-expanded={showMore}
          aria-label={
            showMore ? "Show fewer adjustments" : "Show more adjustments"
          }
          disabled={disabled}
          onClick={() => setShowMore((prev) => !prev)}
          className="flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-xl px-1 pb-1 pt-1.5 text-center transition-[color,background-color,scale] duration-150 ease-out not-disabled:hover:bg-black/[0.03] not-disabled:active:scale-[0.97] disabled:opacity-40"
          style={{
            color: moreHasEdits ? "var(--se-fg)" : "var(--se-muted)",
          }}
        >
          <span className="se-dial text-[20px] leading-none">
            <span className="se-dial-icon">{showMore ? "−" : "+"}</span>
          </span>
          <span className="flex min-h-[2.2em] items-start justify-center text-[11px] font-medium leading-tight">
            {showMore ? "Less" : "More"}
          </span>
        </button>
      </div>

      <div className="grid min-h-6 grid-cols-[1fr_auto_1fr] items-center px-3">
        <button
          type="button"
          className="min-h-6 justify-self-start px-1 py-0.5 text-[12px] text-[var(--se-muted)] transition-colors hover:text-[var(--se-fg)] disabled:pointer-events-none disabled:opacity-40"
          disabled={disabled || !hasAnyAdjustments}
          onClick={onResetAll}
        >
          Reset all
        </button>
        <button
          type="button"
          className="min-h-6 tabular-nums px-2 text-[14px] font-semibold disabled:opacity-100"
          disabled={disabled || value === 0}
          onClick={() => onReset(activeKey)}
          aria-label={
            value === 0
              ? `${meta.label} ${formatValue(activeKey, value)}`
              : `Reset ${meta.label}`
          }
          style={{
            color: value === 0 ? "var(--se-muted)" : "var(--se-fg)",
          }}
        >
          {formatValue(activeKey, value)}
        </button>
        <span className="justify-self-end" aria-hidden />
      </div>

      <div className="px-1" onPointerUp={onCommit} onPointerCancel={onCommit}>
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
  const radius = 24.75;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  return (
    <span
      className="se-dial"
      data-active={active || undefined}
      aria-hidden
      style={{
        color: active
          ? "#ffffff"
          : adjusted
            ? "var(--se-fg)"
            : "var(--se-muted)",
      }}
    >
      {progress > 0.01 ? (
        <svg className="se-dial-ring" viewBox="0 0 52 52">
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke={active ? "rgba(255,255,255,0.85)" : "var(--se-fg)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
      ) : null}
      <span className="se-dial-icon">{children}</span>
    </span>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ADJUSTMENT_ICONS: Record<AdjustmentKey, ReactNode> = {
  exposure: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  brilliance: (
    <svg {...iconProps}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
      <path d="m6.5 6.5 1.5 1.5M16 16l1.5 1.5M6.5 17.5 8 16M16 8l1.5-1.5" />
    </svg>
  ),
  highlights: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  shadows: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <path
        d="M12 4a8 8 0 0 0 0 16"
        fill="currentColor"
        stroke="none"
        opacity="0.35"
      />
    </svg>
  ),
  contrast: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  brightness: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M5.4 18.6l1.4-1.4M17.2 6.8l1.4-1.4" />
    </svg>
  ),
  blackPoint: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" />
    </svg>
  ),
  saturation: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  vibrancy: (
    <svg {...iconProps}>
      <path d="M12 4c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10Z" />
    </svg>
  ),
  warmth: (
    <svg {...iconProps}>
      <path d="M12 14a3 3 0 0 0 1.5-5.6V5.5a1.5 1.5 0 0 0-3 0v2.9A3 3 0 0 0 12 14Z" />
      <path d="M9 17h6M10 20h4" />
    </svg>
  ),
  tint: (
    <svg {...iconProps}>
      <path d="M7 8h10M7 12h10M7 16h10" />
      <circle cx="9" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="16" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  sharpness: (
    <svg {...iconProps}>
      <path d="m12 4 2.2 5.2L20 12l-5.8 2.8L12 20l-2.2-5.2L4 12l5.8-2.8Z" />
    </svg>
  ),
  definition: (
    <svg {...iconProps}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  ),
  noiseReduction: (
    <svg {...iconProps}>
      <path d="M4 12c1.5-3 3-4.5 4.5-4.5S11 11 12 12s2 4.5 3.5 4.5S19 15 20 12" />
    </svg>
  ),
  vignette: (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  ),
};
