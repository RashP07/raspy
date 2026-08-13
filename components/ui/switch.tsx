"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type SwitchProps = ComponentProps<typeof BaseSwitch.Root>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={cn(
        // 44px of touch target around a 28px track: the control stays small
        // without becoming a small tap target.
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill p-0.5",
        "transition-colors duration-150 ease-out outline-none",
        "bg-track data-checked:bg-accent",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "size-6 rounded-pill bg-raised shadow-raised",
          "transition-transform duration-150 ease-out",
          "data-checked:translate-x-5 data-checked:bg-accent-fg",
        )}
      />
    </BaseSwitch.Root>
  );
}
