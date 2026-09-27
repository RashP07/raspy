"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { capturePageview, startPostHog } from "@/app/lib/posthog";

/** Renders nothing; starts PostHog once and reports each route change. */
export function PostHogLoader() {
  const pathname = usePathname();

  useEffect(() => startPostHog(), []);
  // A no-op until PostHog has loaded, and deduped against the load's own view.
  useEffect(() => capturePageview(), [pathname]);

  return null;
}
