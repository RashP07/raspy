"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  isLikelyEuVisitor,
  readStoredConsent,
  setConsent,
} from "@/app/lib/consent";

/**
 * A bar, not a modal. The editor stays usable behind it and the photo work is
 * unaffected either way, so blocking the app to collect an answer about page
 * counting would be disproportionate — and consent obtained by blocking is not
 * freely given anyway.
 *
 * Accept and Decline are the same size, side by side, one interaction each.
 * A decline that costs more effort than an accept is not a real choice.
 */
export function ConsentBanner() {
  // Server-rendered as nothing: the decision depends on localStorage and the
  // visitor's timezone, neither of which exists until hydration.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(readStoredConsent() === null && isLikelyEuVisitor());
    };
    sync();

    // Reopened from Settings, or answered in another tab.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CONSENT_STORAGE_KEY) sync();
    };
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className={[
        "fixed inset-x-0 bottom-0 z-40 flex justify-center",
        "px-[max(0.75rem,env(safe-area-inset-left))]",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
        "pointer-events-none",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-auto w-[min(34rem,100%)] rounded-panel p-4",
          "border border-hairline bg-surface/95 text-fg backdrop-blur-md",
          "shadow-toast",
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <h2 id="consent-title" className="text-body font-semibold">
            Analytics cookies
          </h2>
          <p id="consent-body" className="text-caption text-muted">
            We count page visits with Google Analytics and PostHog to see
            whether Raspy is worth continuing. Your photos are never part of it — they never
            leave this device either way.{" "}
            <Link
              href="/privacy"
              className="text-fg underline underline-offset-2"
            >
              Privacy
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 border border-hairline-strong sm:flex-none"
            onClick={() => setConsent("denied")}
          >
            Decline
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="flex-1 sm:flex-none"
            onClick={() => setConsent("granted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
