"use client";

import { Drawer } from "@base-ui/react/drawer";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 min-h-dvh bg-black/60 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="fixed inset-0 flex items-end justify-center">
          <Drawer.Popup
            className={cn(
              "scrollbar-none w-full max-w-[var(--stage-max,100%)] max-h-[min(85dvh,calc(100dvh-3rem))] overflow-y-auto overscroll-contain outline-none touch-auto",
              "rounded-t-panel border border-hairline bg-surface text-fg",
              // Same gutter the editor chrome uses, so a sheet reads as the
              // same surface sliding up rather than a differently-inset one.
              "px-(--spacing-gutter) pb-[calc(var(--spacing-gutter)+env(safe-area-inset-bottom,0px))] pt-3",
              "[transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              "data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
              className,
            )}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-pill bg-hairline-strong" />
            <Drawer.Content className="mx-auto w-full max-w-lg">
              {title ? (
                <Drawer.Title className="mb-1 text-center text-body font-medium tracking-tight">
                  {title}
                </Drawer.Title>
              ) : (
                <Drawer.Title className="sr-only">Sheet</Drawer.Title>
              )}
              {description ? (
                <Drawer.Description className="mb-4 text-center text-label text-muted">
                  {description}
                </Drawer.Description>
              ) : null}
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
