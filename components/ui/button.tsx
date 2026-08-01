"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--se-accent)] text-[var(--se-accent-fg)] hover:not-data-disabled:bg-[var(--se-accent-hover)] hover:not-data-disabled:shadow-[0_2px_8px_var(--se-shadow-strong)] active:not-data-disabled:brightness-90",
  danger:
    "bg-[var(--se-danger)] text-[var(--se-danger-fg)] hover:not-data-disabled:brightness-110 active:not-data-disabled:brightness-95",
  ghost:
    "bg-transparent text-inherit hover:not-data-disabled:bg-[var(--se-hover)] active:not-data-disabled:bg-[var(--se-selected-bg)]",
} as const;

const pressScale =
  "active:not-data-disabled:scale-[0.96] transition-[color,background-color,border-color,box-shadow,scale,filter] duration-150 ease-out";

/* Heights are touch targets, not decoration: every size except `sm` (which is
   only ever used for pills sitting inside a taller row) clears 44px on its
   own, so callers no longer bolt a `min-h-11` onto whatever they picked. */
const sizes = {
  sm: "h-9 min-h-9 gap-1.5 px-3.5 text-[14px]",
  md: "h-11 min-h-11 gap-2 px-3 text-[16px]",
  lg: "h-12 min-h-12 gap-2 px-4 text-[16px]",
  icon: "size-11 min-h-11 min-w-11 p-0",
  "icon-sm": "size-10 min-h-10 min-w-10 p-0",
} as const;

export type ButtonProps = ComponentProps<typeof BaseButton> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium select-none outline-none",
        pressScale,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--se-accent)]",
        "data-disabled:opacity-40 disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
