import { describe, expect, it } from "vitest";
import {
  aspectValue,
  clampStraighten,
  fitAspectBounds,
  normalizeBounds,
  nextRotation,
  outputCropDimensions,
} from "./crop";
import { createDefaultCrop } from "../editor/defaults";

describe("crop geometry", () => {
  it("locks aspect ratios", () => {
    expect(aspectValue("1:1", 100, 50)).toBe(1);
    expect(aspectValue("16:9", 100, 50)).toBeCloseTo(16 / 9);
    expect(aspectValue("original", 200, 100)).toBe(2);
    expect(aspectValue("free", 100, 50)).toBeNull();
  });

  it("uses the oriented source aspect for Original", () => {
    expect(aspectValue("original", 3000, 2000, 0)).toBe(1.5);
    expect(aspectValue("original", 3000, 2000, 90)).toBeCloseTo(2 / 3);
  });

  it("fits and normalizes bounds", () => {
    const fitted = fitAspectBounds(1, 200, 100, 0, {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(fitted.width * 200).toBeCloseTo(fitted.height * 100);
    expect(fitted.x + fitted.width).toBeLessThanOrEqual(1.0001);
    expect(fitted.y + fitted.height).toBeLessThanOrEqual(1.0001);

    const normalized = normalizeBounds({
      x: -0.2,
      y: 0.9,
      width: 0.5,
      height: 0.5,
    });
    expect(normalized.x).toBeGreaterThanOrEqual(0);
    expect(normalized.y + normalized.height).toBeLessThanOrEqual(1.0001);
  });

  it("clamps straighten and rotates", () => {
    expect(clampStraighten(90)).toBe(45);
    expect(clampStraighten(-90)).toBe(-45);
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(270)).toBe(0);
  });

  it("computes output dimensions with rotation", () => {
    const crop = createDefaultCrop();
    crop.rotation = 90;
    crop.bounds = { x: 0, y: 0, width: 0.5, height: 0.5 };
    const dims = outputCropDimensions(4000, 3000, crop, 1);
    // rotated source 3000x4000, half crop => 1500x2000
    expect(dims.width).toBe(1500);
    expect(dims.height).toBe(2000);
  });
});
