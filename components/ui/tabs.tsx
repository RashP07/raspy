"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  className,
  ...props
}: ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root className={cn("w-full", className)} {...props} />;
}

export function TabsList({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn("relative z-0 flex items-center", className)}
      {...props}
    >
      {children}
    </BaseTabs.List>
  );
}

/**
 * The moving thumb behind the active tab. Base UI publishes the active tab's
 * box as --active-tab-* vars on this element; `.se-mode-thumb` reads them.
 */
export function TabsIndicator({
  className,
  ...props
}: ComponentProps<typeof BaseTabs.Indicator>) {
  return (
    <BaseTabs.Indicator
      renderBeforeHydration
      className={cn("pointer-events-none absolute z-10", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "relative z-20 inline-flex items-center justify-center gap-1 rounded-none border-0 bg-transparent font-medium outline-none select-none",
        "text-muted data-active:text-active",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "transition-colors duration-150",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      className={cn("outline-none [[hidden]]:hidden", className)}
      {...props}
    />
  );
}
