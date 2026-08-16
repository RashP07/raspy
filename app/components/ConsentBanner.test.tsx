import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentBanner } from "./ConsentBanner";
import { CONSENT_STORAGE_KEY } from "@/app/lib/consent";

/** jsdom resolves to UTC, so the timezone has to be forced per case. */
function setTimeZone(zone: string) {
  const original = Intl.DateTimeFormat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Intl as any).DateTimeFormat = function () {
    return { resolvedOptions: () => ({ timeZone: zone }) };
  };
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).DateTimeFormat = original;
  };
}

let restoreTimeZone = () => {};

beforeEach(() => {
  localStorage.clear();
  window.dataLayer = [];
});

afterEach(() => {
  restoreTimeZone();
  restoreTimeZone = () => {};
});

describe("ConsentBanner", () => {
  it("asks an undecided EU visitor", () => {
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("stays out of the way outside the EU", () => {
    restoreTimeZone = setTimeZone("America/New_York");
    render(<ConsentBanner />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not re-ask a visitor who already answered", () => {
    restoreTimeZone = setTimeZone("Europe/Berlin");
    localStorage.setItem(CONSENT_STORAGE_KEY, "denied");
    render(<ConsentBanner />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers decline and accept as one click each", () => {
    // A decline that costs more effort than an accept is not a free choice.
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    expect(screen.getByRole("button", { name: "Decline" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Accept" })).toBeVisible();
  });

  it("records acceptance and dismisses itself", async () => {
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
    expect(window.dataLayer).toContainEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("records a refusal as an explicit denial, not as silence", async () => {
    // Storing "denied" is what stops the banner reappearing every visit while
    // keeping analytics_storage denied.
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(window.dataLayer).toContainEqual([
      "consent",
      "update",
      { analytics_storage: "denied" },
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not trap the editor behind it", () => {
    // aria-modal would tell a screen reader the app underneath is inert, which
    // it is not — the whole point is that editing continues either way.
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "false");
  });
});

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

describe("banner discoverability", () => {
  it("links to the policy, which is where consent has to be explained", async () => {
    restoreTimeZone = setTimeZone("Europe/Berlin");
    render(<ConsentBanner />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
});
