import { afterEach, describe, expect, it } from "vitest";
import {
  describeExportCeiling,
  exportAttemptLadder,
  exportMemoryCap,
  exportPixelBudget,
  MIN_EXPORT_LONG_EDGE,
} from "./exportLimits";
import { constrainExportDimensions } from "@/app/lib/image/geometry";

function setDeviceMemory(value: number | undefined) {
  Object.defineProperty(navigator, "deviceMemory", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  setDeviceMemory(undefined);
});

describe("exportMemoryCap", () => {
  it("keeps the desktop cap when the device does not report memory", () => {
    setDeviceMemory(undefined);
    expect(exportMemoryCap()).toBe(256 * 1024 * 1024);
  });

  it("cuts the budget on a low-memory phone", () => {
    setDeviceMemory(2);
    expect(exportMemoryCap()).toBe(96 * 1024 * 1024);
    // Still enough for a 12 megapixel phone photo.
    expect(exportPixelBudget()).toBeGreaterThan(12_000_000);
  });

  it("never exceeds the ceiling on a large machine", () => {
    setDeviceMemory(8);
    expect(exportMemoryCap()).toBe(256 * 1024 * 1024);
  });
});

describe("describeExportCeiling", () => {
  it("says nothing when nothing was reduced", () => {
    const dimensions = constrainExportDimensions(
      { width: 2000, height: 1500 },
      8192,
    );
    expect(dimensions.limitedBy).toBe("none");
    expect(describeExportCeiling(dimensions)).toBeNull();
  });

  it("names the hardware limit when the long edge bound", () => {
    // Big, but only 27 MP — under the 32 MP desktop budget, so the long edge
    // is what bites.
    const dimensions = constrainExportDimensions(
      { width: 18000, height: 1500 },
      8192,
    );
    expect(dimensions.limitedBy).toBe("dimension");
    expect(describeExportCeiling(dimensions)).toContain("8,192 px");
  });

  it("quotes the reported memory when the budget bound", () => {
    setDeviceMemory(4);
    const dimensions = constrainExportDimensions(
      { width: 9000, height: 6000 },
      8192,
      exportMemoryCap(),
    );
    expect(dimensions.limitedBy).toBe("memory");
    const copy = describeExportCeiling(dimensions);
    expect(copy).toContain("4 GB");
    expect(copy).toContain("25 megapixels");
  });

  it("explains the budget without naming memory the device never reported", () => {
    setDeviceMemory(undefined);
    const dimensions = constrainExportDimensions(
      { width: 9000, height: 6000 },
      8192,
      exportMemoryCap(),
    );
    expect(dimensions.limitedBy).toBe("memory");
    const copy = describeExportCeiling(dimensions);
    expect(copy).toContain("34 megapixels");
    expect(copy).not.toContain("GB");
  });
});

describe("exportAttemptLadder", () => {
  it("starts at the requested size", () => {
    const [first] = exportAttemptLadder({ width: 4000, height: 3000 });
    expect(first).toEqual({ width: 4000, height: 3000 });
  });

  it("halves the pixel count at each step", () => {
    const ladder = exportAttemptLadder({ width: 4000, height: 3000 });
    expect(ladder).toHaveLength(3);
    const areas = ladder.map((size) => size.width * size.height);
    expect(areas[1] / areas[0]).toBeCloseTo(0.5, 2);
    expect(areas[2] / areas[0]).toBeCloseTo(0.25, 2);
  });

  it("preserves the aspect ratio", () => {
    for (const size of exportAttemptLadder({ width: 4000, height: 3000 })) {
      expect(size.width / size.height).toBeCloseTo(4 / 3, 2);
    }
  });

  it("stops rather than producing a uselessly small image", () => {
    const ladder = exportAttemptLadder({ width: 800, height: 600 });
    expect(ladder).toHaveLength(1);
    for (const size of ladder) {
      expect(Math.max(size.width, size.height)).toBeGreaterThanOrEqual(
        MIN_EXPORT_LONG_EDGE,
      );
    }
  });
});
