/**
 * Analytics consent, on Google Consent Mode v2. Mirrors the theme preference:
 * localStorage plus a window event so every mounted control re-reads the same
 * source of truth.
 *
 * Two independent mechanisms, deliberately:
 *
 *   1. `gtag('consent','default',…)` with a `region` list. Google resolves this
 *      by IP on their side, so an EU visitor gets `analytics_storage: denied`
 *      whatever this file's guesswork concludes. This is the legal floor.
 *   2. `isLikelyEuVisitor()`, a timezone guess, decides only whether to *show*
 *      the banner. Guessing wrong shows a banner to someone who did not need
 *      one, or withholds one from someone whose storage is already denied by
 *      (1) — never the other way round.
 *
 * Splitting it that way is what lets a static app with no server be correct
 * without an IP lookup on every visit.
 */

import { GA_MEASUREMENT_ID } from "./analytics";

export type ConsentChoice = "granted" | "denied";

/**
 * Versioned, because the privacy page promises that widening what is collected
 * asks again. v2 added PostHog: an acceptance given for Google Analytics alone
 * does not extend to it, but a decline under the old key still stands.
 */
export const CONSENT_STORAGE_KEY = "raspy:consent:v2";
const LEGACY_CONSENT_STORAGE_KEY = "raspy:consent";

/** Fired on this window whenever the choice changes. Mirrors THEME_EVENT. */
export const CONSENT_EVENT = "raspy:consentchange";

/**
 * EU + EEA + UK + Switzerland, as ISO 3166-1 codes for the `region` parameter.
 * Switzerland is not bound by the GDPR but the revised FADP is close enough
 * that treating it separately would be a distinction without a difference.
 */
const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
];

/**
 * Timezones outside the `Europe/` prefix that still belong to a listed country.
 * The Canaries, Madeira and the Azores are Spain and Portugal; Reykjavik and
 * Faroe are EEA; Nicosia and Famagusta are Cyprus.
 */
const EXTRA_EU_TIMEZONES = new Set([
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Atlantic/Reykjavik",
  "Atlantic/Faroe",
  "Asia/Nicosia",
  "Asia/Famagusta",
]);

/**
 * Deliberately over-inclusive: every `Europe/` zone counts, including Moscow,
 * Istanbul and Kyiv, which are not in scope. Over-inclusion costs a banner
 * nobody needed; under-inclusion would cost a banner somebody did.
 */
export function isLikelyEuVisitor(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return true; // Unknown location — assume the stricter regime.
    return zone.startsWith("Europe/") || EXTRA_EU_TIMEZONES.has(zone);
  } catch {
    return true;
  }
}

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

/** `null` means undecided, which is what makes the banner appear. */
export function readStoredConsent(): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (isConsentChoice(stored)) return stored;
    return localStorage.getItem(LEGACY_CONSENT_STORAGE_KEY) === "denied"
      ? "denied"
      : null;
  } catch {
    return null;
  }
}

/**
 * What is actually in force right now, for a control that has to render a
 * definite on/off. An undecided visitor inherits the default their region gets
 * from CONSENT_INIT_SCRIPT, so the toggle never claims a state the tag is not
 * already in.
 */
export function effectiveConsent(): ConsentChoice {
  const stored = readStoredConsent();
  if (stored) return stored;
  return isLikelyEuVisitor() ? "denied" : "granted";
}

function storeConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
  } catch {
    // Private mode or a full quota. The choice still holds for this session,
    // and an unstored choice re-asks next time rather than assuming consent.
  }
}

/**
 * Consent Mode stops GA writing cookies, but it does not retract ones already
 * written before a visitor changed their mind. Expiring them here is the
 * difference between honouring a withdrawal and merely recording it.
 *
 * PostHog keeps a copy of its identifier in web storage as well as the cookie,
 * so its `ph_` entries go too. Its own opt-out flag is `__ph_`-prefixed and is
 * deliberately left alone: removing it would opt a live instance back in.
 */
export function clearAnalyticsStorage(): void {
  const prefixes = ["_ga", "_gid", "_gat", "ph_"];
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name): name is string =>
      Boolean(name) && prefixes.some((prefix) => name!.startsWith(prefix)),
    );

  // The host GA wrote to may be any parent of this one, and a cookie only
  // clears against the exact domain that set it, so walk the suffixes.
  const parts = location.hostname.split(".");
  const domains = [
    undefined,
    ...parts.map((_, index) => `.${parts.slice(index).join(".")}`),
  ];

  for (const name of new Set(names)) {
    for (const domain of domains) {
      document.cookie = `${name}=; max-age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }

  for (const area of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = globalThis[area];
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key?.startsWith("ph_")) keys.push(key);
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // Storage blocked: then PostHog could not have written to it either.
    }
  }
}

type GtagWindow = Window & { dataLayer?: unknown[] };

function pushConsentUpdate(choice: ConsentChoice): void {
  const layer = (window as GtagWindow).dataLayer;
  if (!layer) return;
  // Push the raw arguments shape rather than calling gtag(), because the
  // helper is defined by the inline init script and may not exist if the
  // Google script was blocked. dataLayer is ours and is always safe to append.
  layer.push(["consent", "update", { analytics_storage: choice }]);
}

export function setConsent(choice: ConsentChoice): void {
  storeConsent(choice);
  pushConsentUpdate(choice);
  if (choice === "denied") clearAnalyticsStorage();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * Runs immediately before the Google tag, so the defaults are queued on
 * dataLayer before anything can read them. Dependency-free: it is inlined as
 * a string, exactly like THEME_INIT_SCRIPT.
 *
 * `wait_for_update` holds measurement briefly so a returning visitor's stored
 * choice is applied to their first pageview rather than the one after it.
 */
export const CONSENT_INIT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
});
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  region: ${JSON.stringify(CONSENT_REQUIRED_REGIONS)},
  wait_for_update: 500
});
try {
  var stored = localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});
  if (stored === null && localStorage.getItem(${JSON.stringify(LEGACY_CONSENT_STORAGE_KEY)}) === 'denied') {
    stored = 'denied';
  }
  if (stored === 'granted' || stored === 'denied') {
    gtag('consent', 'update', { analytics_storage: stored });
  }
} catch (e) {}
gtag('set', 'url_passthrough', true);
gtag('set', 'ads_data_redaction', true);
`.trim();

/** Re-exported so the banner copy and the tag never drift on the property. */
export { GA_MEASUREMENT_ID };
