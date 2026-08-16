import { afterEach, describe, expect, it } from "vitest";
import {
  bandRowsFor,
  describeExportCeiling,
  exportAttemptLadder,
  exportMemoryCap,
  exportMemoryCapFor,
  exportPixelBudget,
  supportsBandedExport,
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

describe("banded export", () => {
  const workerGlobals = ["Worker", "OffscreenCanvas", "createImageBitmap"];

  function setWorkerSupport(available: boolean) {
    for (const name of workerGlobals) {
      if (available) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          value: function stub() {},
        });
      } else {
        Reflect.deleteProperty(globalThis, name);
      }
    }
  }

  afterEach(() => setWorkerSupport(false));

  it("applies to JPEG only", () => {
    setWorkerSupport(true);
    expect(supportsBandedExport("image/jpeg")).toBe(true);
    // PNG needs streaming deflate; no browser can encode WebP incrementally.
    expect(supportsBandedExport("image/png")).toBe(false);
    expect(supportsBandedExport("image/webp")).toBe(false);
  });

  it("needs the worker path to exist", () => {
    setWorkerSupport(false);
    expect(supportsBandedExport("image/jpeg")).toBe(false);
  });

  it("lifts the memory budget for the format that can stream", () => {
    setDeviceMemory(2);
    setWorkerSupport(true);
    expect(exportMemoryCapFor("image/jpeg")).toBe(Number.POSITIVE_INFINITY);
    expect(exportMemoryCapFor("image/png")).toBe(exportMemoryCap());
  });

  it("falls back to the plain budget where banding cannot run", () => {
    setDeviceMemory(2);
    setWorkerSupport(false);
    expect(exportMemoryCapFor("image/jpeg")).toBe(exportMemoryCap());
  });
});

describe("bandRowsFor", () => {
  it("always yields whole 16-row MCU strips", () => {
    for (const width of [37, 640, 1920, 4032, 8192]) {
      expect(bandRowsFor(width) % 16).toBe(0);
      expect(bandRowsFor(width)).toBeGreaterThanOrEqual(16);
    }
  });

  it("keeps the readback buffer bounded as the image widens", () => {
    for (const width of [640, 1920, 4032, 8192]) {
      const bytes = width * bandRowsFor(width) * 4;
      expect(bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    }
  });

  it("gives a narrow image fewer rows than its buffer could hold, not more", () => {
    expect(bandRowsFor(64)).toBe(512);
    expect(bandRowsFor(4000)).toBeLessThan(bandRowsFor(1000));
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
