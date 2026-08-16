import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyPage from "./page";
import { GA_MEASUREMENT_ID } from "@/app/lib/analytics";
import { CONSENT_STORAGE_KEY } from "@/app/lib/consent";

beforeEach(() => {
  localStorage.clear();
  window.dataLayer = [];
});

describe("privacy page", () => {
  it("names the property the app actually measures to", () => {
    // The page is only worth having if it cannot drift from the tag. Reading
    // the id from the same module is what keeps the two honest.
    render(<PrivacyPage />);
    expect(screen.getAllByText(GA_MEASUREMENT_ID).length).toBeGreaterThan(0);
  });

  it("identifies a controller and a way to reach them", () => {
    // A policy with no identifiable controller and no contact fails the part
    // of the GDPR that makes the rest of it actionable.
    render(<PrivacyPage />);
    expect(screen.getByText(/Rashmita Parmanik/)).toBeInTheDocument();
    const mail = screen.getByRole("link", {
      name: /rashmitaparmanik9876@gmail\.com/,
    });
    expect(mail).toHaveAttribute(
      "href",
      "mailto:rashmitaparmanik9876@gmail.com",
    );
  });

  it("states the retention period rather than leaving it open-ended", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/14 months/)).toBeInTheDocument();
  });

  it("names the session cookie exactly as GA will set it", () => {
    // Built from the measurement id, and asserted as one contiguous string:
    // interpolating mid-sentence splits it across text nodes and the name a
    // reader checks in devtools would no longer match the one printed here.
    render(<PrivacyPage />);
    const expected = `_ga_${GA_MEASUREMENT_ID.replace(/^G-/, "")}`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("withdraws consent from the page itself, not only from Settings", async () => {
    // Start granted explicitly rather than inheriting the regional default,
    // so the case under test is the withdrawal and not the environment.
    localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    render(<PrivacyPage />);
    const toggle = screen.getByRole("switch", {
      name: /Analytics on this device/,
    });
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(window.dataLayer).toContainEqual([
      "consent",
      "update",
      { analytics_storage: "denied" },
    ]);
  });

  it("grants again from the same control", async () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "denied");
    render(<PrivacyPage />);
    const toggle = screen.getByRole("switch", {
      name: /Analytics on this device/,
    });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
  });

  it("links back to the editor", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("link", { name: /Raspy/ })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}
