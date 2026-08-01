import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

export function Spinner({ size = 24, label = "Loading", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-black/10 border-t-[var(--se-active)]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
