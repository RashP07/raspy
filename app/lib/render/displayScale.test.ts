import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The module memoizes its device verdict, so every case needs a fresh import
 * after the globals are in place.
 */
async function scaleFor(options: {
  devicePixelRatio?: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
}) {
  vi.resetModules();
  vi.stubGlobal("window", { devicePixelRatio: options.devicePixelRatio ?? 3 });
  vi.stubGlobal("navigator", {
    ...(options.deviceMemory === undefined
      ? {}
      : { deviceMemory: options.deviceMemory }),
    ...(options.hardwareConcurrency === undefined
      ? {}
      : { hardwareConcurrency: options.hardwareConcurrency }),
    ...(options.saveData === undefined
      ? {}
      : { connection: { saveData: options.saveData } }),
  });
  const { displayScale } = await import("./displayScale");
  return displayScale();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("displayScale", () => {
  it("follows the device ratio on capable hardware", async () => {
    expect(
      await scaleFor({ deviceMemory: 8, hardwareConcurrency: 8 }),
    ).toBe(3);
  });

  it("caps at 3 so browser zoom cannot inflate the buffer", async () => {
    expect(
      await scaleFor({
        devicePixelRatio: 6,
        deviceMemory: 8,
        hardwareConcurrency: 8,
      }),
    ).toBe(3);
  });

  it("drops to 1 when memory is at the bottom of its range", async () => {
    expect(
      await scaleFor({ deviceMemory: 2, hardwareConcurrency: 8 }),
    ).toBe(1);
  });

  it("drops to 1 when core count is at the bottom of its range", async () => {
    expect(
      await scaleFor({ deviceMemory: 8, hardwareConcurrency: 2 }),
    ).toBe(1);
  });

  it("drops to 1 when both signals are middling at once", async () => {
    expect(
      await scaleFor({ deviceMemory: 4, hardwareConcurrency: 4 }),
    ).toBe(1);
  });

  it("honours an explicit save-data request", async () => {
    expect(
      await scaleFor({
        deviceMemory: 8,
        hardwareConcurrency: 8,
        saveData: true,
      }),
    ).toBe(1);
  });

  it("does not downgrade on one middling signal alone", async () => {
    // The budget-phone signature is both at once; 4 cores with plenty of
    // memory is an ordinary laptop.
    expect(
      await scaleFor({ deviceMemory: 16, hardwareConcurrency: 4 }),
    ).toBe(3);
  });

  it("does not downgrade when Safari reports neither hint", async () => {
    // deviceMemory and saveData are Chromium-only. Missing must not read as low.
    expect(await scaleFor({ hardwareConcurrency: 8 })).toBe(3);
  });

  it("falls back to 1 rather than 0 for a bogus device ratio", async () => {
    expect(
      await scaleFor({
        devicePixelRatio: 0,
        deviceMemory: 8,
        hardwareConcurrency: 8,
      }),
    ).toBe(1);
  });
});
