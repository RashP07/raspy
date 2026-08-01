"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--se-accent)] text-white hover:not-data-disabled:bg-[var(--se-accent-hover)] hover:not-data-disabled:shadow-[0_2px_8px_rgb(0_0_0/0.18)] active:not-data-disabled:brightness-90",
  danger:
    "bg-[var(--se-danger)] text-white hover:not-data-disabled:brightness-110 active:not-data-disabled:brightness-95",
  ghost:
    "bg-transparent text-inherit hover:not-data-disabled:bg-black/5 active:not-data-disabled:bg-black/10",
} as const;

const pressScale =
  "active:not-data-disabled:scale-[0.96] transition-[color,background-color,border-color,box-shadow,scale,filter] duration-150 ease-out";

const sizes = {
  sm: "h-8 min-h-8 gap-1.5 px-2.5 text-xs",
  md: "h-10 min-h-10 gap-2 px-3 text-sm",
  lg: "h-12 min-h-12 gap-2 px-4 text-sm",
  icon: "size-10 min-h-10 min-w-10 p-0",
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
