/**
 * PostHog, counting page views under the same consent choice as GA.
 *
 * GA's EU default is enforced by Google from the visitor's IP (see consent.ts).
 * PostHog has no equivalent, so the gate is here instead:
 *
 *   - effective consent denied (a decline, or an undecided visitor whose
 *     timezone looks European): the SDK is never even downloaded.
 *   - undecided elsewhere: counted with in-memory persistence, so nothing is
 *     written to the device and each visit stands alone.
 *   - accepted: a first-party cookie, scoped to this host, links visits.
 *
 * The stored consent choice is the one source of truth. PostHog's own
 * opt-in/out flag only follows it, so the two never disagree about what is in
 * force.
 */

import type { PostHog, PostHogConfig } from "posthog-js/dist/module.slim";
import { POSTHOG_HOST, POSTHOG_TOKEN } from "./analytics";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  clearAnalyticsStorage,
  effectiveConsent,
  readStoredConsent,
  type ConsentChoice,
} from "./consent";

/**
 * Page views and page leaves, and nothing else. The slim build is used, which
 * leaves autocapture, replay, heatmaps, surveys and the rest out of the bundle
 * entirely — half the size of the default one. The flags below still turn them
 * off explicitly, so that a later switch back to the full build cannot quietly
 * enable them. Remote config is off for the same reason, and with it every
 * script PostHog would otherwise fetch at runtime.
 */
export function posthogConfig(
  stored: ConsentChoice | null,
): Partial<PostHogConfig> {
  return {
    api_host: POSTHOG_HOST,
    defaults: "2026-08-30",
    persistence: stored === "granted" ? "localStorage+cookie" : "memory",
    // Consent given here is for Raspy, not for the portfolio on the parent
    // domain, so the identifier must not be readable there.
    cross_subdomain_cookie: false,
    person_profiles: "identified_only",
    // Captured by capturePageview instead: automatic capture on client-side
    // navigation needs the history extension, which the slim build omits.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    mask_personal_data_properties: true,
  };
}

let loading: Promise<PostHog> | null = null;
let lastPage: string | null = null;

/**
 * One `$pageview` per distinct page. Called on load and on every route change;
 * the dedupe covers a navigation that lands while the SDK is still loading,
 * which both paths would otherwise report.
 */
export function capturePageview(): void {
  void loading
    ?.then((posthog) => {
      const page = location.pathname + location.search;
      if (page === lastPage) return;
      lastPage = page;
      posthog.capture("$pageview");
    })
    .catch(() => {});
}

function load(): Promise<PostHog> {
  loading ??= import("posthog-js/dist/module.slim").then((module) => {
    const posthog = module.default;
    // A flag left by an earlier decline would otherwise outvote a later
    // acceptance made in another tab or before this page loaded.
    try {
      localStorage.removeItem(`__ph_opt_in_out_${POSTHOG_TOKEN}`);
    } catch {
      // Storage blocked, so there is no stale flag to clear.
    }
    posthog.init(POSTHOG_TOKEN, posthogConfig(readStoredConsent()));
    return posthog;
  });
  capturePageview();
  return loading;
}

async function applyConsent(): Promise<void> {
  if (effectiveConsent() === "denied") {
    if (!loading) return;
    (await loading).opt_out_capturing();
    // Opting out stops new writes; this removes what was already there.
    clearAnalyticsStorage();
    return;
  }

  const posthog = await load();
  if (posthog.has_opted_out_capturing()) {
    posthog.opt_in_capturing({ captureEventName: false });
  }
  if (readStoredConsent() === "granted") {
    posthog.set_config({ persistence: "localStorage+cookie" });
  }
}

/**
 * Starts after the load event and the next idle moment, like the Google tag:
 * measurement never shares bandwidth with what the first paint waits on.
 * Returns a cleanup for the effect that calls it.
 */
export function startPostHog(): () => void {
  const apply = () => void applyConsent().catch(() => {});
  // Another tab answering the banner changes storage, not this window.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONSENT_STORAGE_KEY) apply();
  };

  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const begin = () => {
    apply();
    window.addEventListener(CONSENT_EVENT, apply);
    window.addEventListener("storage", onStorage);
  };
  const whenIdle = () => {
    if (typeof requestIdleCallback === "function") {
      idle = requestIdleCallback(begin, { timeout: 3000 });
    } else {
      timer = setTimeout(begin, 1500);
    }
  };

  if (document.readyState === "complete") {
    whenIdle();
  } else {
    window.addEventListener("load", whenIdle, { once: true });
  }

  return () => {
    window.removeEventListener("load", whenIdle);
    if (idle !== undefined) cancelIdleCallback(idle);
    if (timer !== undefined) clearTimeout(timer);
    window.removeEventListener(CONSENT_EVENT, apply);
    window.removeEventListener("storage", onStorage);
  };
}
