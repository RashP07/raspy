import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_EVENT,
  CONSENT_INIT_SCRIPT,
  CONSENT_STORAGE_KEY,
  effectiveConsent,
  isLikelyEuVisitor,
  readStoredConsent,
  setConsent,
} from "./consent";

/** Minimal stand-ins: this module only touches storage, cookies and dataLayer. */
function stubEnvironment(options: { timeZone?: string; stored?: string } = {}) {
  const store = new Map<string, string>();
  if (options.stored) store.set(CONSENT_STORAGE_KEY, options.stored);

  const listeners = new Map<string, Set<() => void>>();
  const dataLayer: unknown[] = [];
  let cookie = "";

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  vi.stubGlobal("location", { hostname: "raspy.rashmitaparmanik.com" });
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
  });
  vi.stubGlobal("Event", class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  });
  vi.stubGlobal("window", {
    dataLayer,
    dispatchEvent: (event: { type: string }) => {
      listeners.get(event.type)?.forEach((fn) => fn());
      return true;
    },
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
  });
  vi.stubGlobal("Intl", {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: options.timeZone ?? "Europe/Berlin" }),
    }),
  });

  return { store, dataLayer, listeners, cookiesWritten: () => cookie };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CONSENT_INIT_SCRIPT", () => {
  it("denies analytics storage for EU regions before the tag loads", () => {
    // The region-scoped default is the legal floor and must name analytics
    // storage as denied alongside a region list.
    expect(CONSENT_INIT_SCRIPT).toContain("analytics_storage: 'denied'");
    expect(CONSENT_INIT_SCRIPT).toMatch(/region: \[/);
    expect(CONSENT_INIT_SCRIPT).toContain('"DE"');
    expect(CONSENT_INIT_SCRIPT).toContain('"FR"');
    expect(CONSENT_INIT_SCRIPT).toContain('"GB"');
  });

  it("denies every advertising signal unconditionally", () => {
    // Both defaults — global and region-scoped — must deny the ad signals,
    // so no region ever gets advertising storage.
    const globalDefault = CONSENT_INIT_SCRIPT.split("gtag('consent', 'default'")[1];
    const regionDefault = CONSENT_INIT_SCRIPT.split("gtag('consent', 'default'")[2];
    for (const block of [globalDefault, regionDefault]) {
      expect(block).toContain("ad_storage: 'denied'");
      expect(block).toContain("ad_user_data: 'denied'");
      expect(block).toContain("ad_personalization: 'denied'");
    }
  });

  it("defines the dataLayer before issuing any consent command", () => {
    // GA_INIT_SCRIPT depends on gtag existing; if this ordering inverts, the
    // defaults are queued after the tag has already read them.
    const layerAt = CONSENT_INIT_SCRIPT.indexOf("window.dataLayer");
    const consentAt = CONSENT_INIT_SCRIPT.indexOf("gtag('consent'");
    expect(layerAt).toBeGreaterThanOrEqual(0);
    expect(layerAt).toBeLessThan(consentAt);
  });

  it("waits for a stored choice rather than measuring past it", () => {
    expect(CONSENT_INIT_SCRIPT).toContain("wait_for_update");
    expect(CONSENT_INIT_SCRIPT).toContain(JSON.stringify(CONSENT_STORAGE_KEY));
  });
});

describe("isLikelyEuVisitor", () => {
  it("treats European timezones as in scope", () => {
    stubEnvironment({ timeZone: "Europe/Berlin" });
    expect(isLikelyEuVisitor()).toBe(true);
  });

  it("catches the outlying territories of listed countries", () => {
    for (const zone of ["Atlantic/Canary", "Asia/Nicosia", "Atlantic/Azores"]) {
      vi.unstubAllGlobals();
      stubEnvironment({ timeZone: zone });
      expect(isLikelyEuVisitor()).toBe(true);
    }
  });

  it("leaves clearly non-European visitors alone", () => {
    stubEnvironment({ timeZone: "America/New_York" });
    expect(isLikelyEuVisitor()).toBe(false);
  });

  it("assumes the stricter regime when the timezone is unreadable", () => {
    stubEnvironment({ timeZone: "" });
    expect(isLikelyEuVisitor()).toBe(true);
  });
});

describe("effectiveConsent", () => {
  it("defaults an undecided EU visitor to denied", () => {
    stubEnvironment({ timeZone: "Europe/Paris" });
    expect(readStoredConsent()).toBeNull();
    expect(effectiveConsent()).toBe("denied");
  });

  it("defaults an undecided visitor elsewhere to granted", () => {
    stubEnvironment({ timeZone: "America/Chicago" });
    expect(effectiveConsent()).toBe("granted");
  });

  it("prefers a stored choice over the regional default", () => {
    stubEnvironment({ timeZone: "America/Chicago", stored: "denied" });
    expect(effectiveConsent()).toBe("denied");
  });

  it("ignores a corrupted stored value rather than trusting it", () => {
    stubEnvironment({ timeZone: "Europe/Madrid", stored: "yes-please" });
    expect(readStoredConsent()).toBeNull();
    expect(effectiveConsent()).toBe("denied");
  });
});

describe("setConsent", () => {
  let env: ReturnType<typeof stubEnvironment>;

  beforeEach(() => {
    env = stubEnvironment({ timeZone: "Europe/Berlin" });
  });

  it("persists the choice and pushes an update onto dataLayer", () => {
    setConsent("granted");
    expect(env.store.get(CONSENT_STORAGE_KEY)).toBe("granted");
    expect(env.dataLayer).toContainEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
  });

  it("expires existing GA cookies on withdrawal, not just on the tag", () => {
    // Consent Mode stops new cookies; it does not retract ones already set.
    (globalThis as unknown as { document: { cookie: string } }).document.cookie =
      "_ga=GA1.1.123; _ga_SJ63XD3708=GS1.1.456";
    setConsent("denied");
    const written = env.cookiesWritten();
    expect(written).toContain("max-age=0");
  });

  it("does not clear cookies when consent is given", () => {
    setConsent("granted");
    expect(env.cookiesWritten()).not.toContain("max-age=0");
  });

  it("notifies listeners so every mounted control re-reads together", () => {
    const seen = vi.fn();
    (globalThis as unknown as {
      window: { addEventListener: (t: string, f: () => void) => void };
    }).window.addEventListener(CONSENT_EVENT, seen);
    setConsent("denied");
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("still records the choice for this session if storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    });
    expect(() => setConsent("granted")).not.toThrow();
    expect(env.dataLayer).toContainEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
  });
});

describe("script ordering", () => {
  it("injects the Google tag itself rather than leaving React to place it", async () => {
    // React 19 hoists <script async src> into <head>, which would put the tag
    // above these inline defaults and let it win the race on a warm cache.
    const { GA_INIT_SCRIPT, GA_SRC } = await import("./analytics");
    expect(GA_INIT_SCRIPT).toContain("createElement('script')");
    expect(GA_INIT_SCRIPT).toContain(GA_SRC);

    const configAt = GA_INIT_SCRIPT.indexOf("gtag('config'");
    const injectAt = GA_INIT_SCRIPT.indexOf("createElement('script')");
    expect(configAt).toBeLessThan(injectAt);
  });
});
