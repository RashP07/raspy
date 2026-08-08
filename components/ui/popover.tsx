"use client";

import { Popover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MenuPopoverProps {
  /** The control that opens the popup. Base UI renders it as the trigger,
   *  so it must be a single element rather than arbitrary nodes. */
  trigger: ReactElement;
  title?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A small anchored panel for secondary controls. Uses the same surface, border
 * and radius as the bottom sheet so the two read as one material.
 */
export function MenuPopover({
  trigger,
  title,
  className,
  children,
}: MenuPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup
            className={cn(
              "z-50 min-w-64 origin-[var(--transform-origin)] rounded-xl p-3 outline-none",
              "border border-[var(--se-hairline)] bg-[var(--se-surface)] text-[var(--se-fg)]",
              "shadow-[0_12px_32px_var(--se-shadow-strong)]",
              "transition-[opacity,transform] duration-150 ease-out",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
              className,
            )}
          >
            {title ? (
              <Popover.Title className="sr-only">{title}</Popover.Title>
            ) : null}
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
