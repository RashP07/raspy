import { describe, expect, it } from "vitest";
import { POSTHOG_HOST } from "./analytics";
import { posthogConfig } from "./posthog";

describe("posthogConfig", () => {
  it("stores nothing on the device until consent is explicit", () => {
    // An undecided visitor outside Europe is counted, but GA's IP-based
    // default has no PostHog equivalent, so nothing may persist for them.
    expect(posthogConfig(null).persistence).toBe("memory");
    expect(posthogConfig("granted").persistence).toBe("localStorage+cookie");
  });

  it("keeps the identifier off the parent domain", () => {
    // Consent given to Raspy is not consent for the portfolio above it.
    expect(posthogConfig("granted").cross_subdomain_cookie).toBe(false);
  });

  it("counts page views and nothing that could observe the editor", () => {
    const config = posthogConfig("granted");
    expect(config.autocapture).toBe(false);
    expect(config.disable_session_recording).toBe(true);
    expect(config.capture_heatmaps).toBe(false);
    expect(config.capture_dead_clicks).toBe(false);
    expect(config.capture_exceptions).toBe(false);
    expect(config.disable_surveys).toBe(true);
  });

  it("never fetches remote config or scripts that could turn those back on", () => {
    const config = posthogConfig("granted");
    expect(config.advanced_disable_flags).toBe(true);
    expect(config.disable_external_dependency_loading).toBe(true);
    expect(config.api_host).toBe(POSTHOG_HOST);
  });
});
