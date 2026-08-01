import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
  /** Set when adjacent visible text already announces the busy state. */
  decorative?: boolean;
}

export function Spinner({
  size = 24,
  label = "Loading",
  className,
  decorative = false,
}: SpinnerProps) {
  return (
    <span
      // Opted out of the global reduced-motion reset: a frozen ring reads as a
      // hung app, so it pulses instead of spinning.
      data-allow-motion
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-[var(--se-hairline-strong)] border-t-[var(--se-active)]",
        "motion-reduce:animate-pulse motion-reduce:border-t-[var(--se-hairline-strong)] motion-reduce:border-[var(--se-active)]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
