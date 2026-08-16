"use client";

import { useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_EVENT,
  effectiveConsent,
  setConsent,
} from "@/app/lib/consent";

/**
 * The withdrawal control, on the page that describes what is being withdrawn.
 * Making someone read the policy here and then go hunting through Settings to
 * act on it is the pattern this exists to avoid.
 */
export function ConsentControl() {
  // Server snapshot is the stricter state, so a hydration mismatch can never
  // briefly render analytics as on when it is off.
  const granted =
    useSyncExternalStore(
      (onStoreChange) => {
        window.addEventListener(CONSENT_EVENT, onStoreChange);
        return () => window.removeEventListener(CONSENT_EVENT, onStoreChange);
      },
      effectiveConsent,
      () => "denied" as const,
    ) === "granted";

  return (
    <div className="flex items-center justify-between gap-4 rounded-control border border-hairline bg-surface p-4">
      <label
        htmlFor="privacy-analytics"
        className="flex flex-col text-body font-medium"
      >
        Analytics on this device
        <span className="text-caption font-normal text-muted">
          {granted
            ? "On. Turning this off stops measurement and deletes the cookies."
            : "Off. No analytics cookies are stored and no measurement is sent."}
        </span>
      </label>
      <Switch
        id="privacy-analytics"
        checked={granted}
        onCheckedChange={(next) => setConsent(next ? "granted" : "denied")}
      />
    </div>
  );
}
