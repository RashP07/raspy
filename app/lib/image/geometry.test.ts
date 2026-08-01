import { describe, expect, it } from "vitest";
import { createDefaultCrop } from "../editor/defaults";
import {
  computeRenderGeometry,
  constrainExportDimensions,
  fitRect,
  transformPoint,
} from "./geometry";

const closePoint = (
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) => {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
};

describe("shared render geometry", () => {
  it("aspect-fits a 3×2 fixture without stretching", () => {
    const fitted = fitRect(390, 500, 300, 200, 16);
    expect(fitted.width / fitted.height).toBeCloseTo(1.5, 5);
    expect(fitted.x).toBeCloseTo(16, 5);
    expect(fitted.y).toBeCloseTo(130.6667, 4);
  });

  it("keeps top-left source coordinates for a neutral crop", () => {
    const crop = createDefaultCrop();
    crop.bounds = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
    const geometry = computeRenderGeometry({
      sourceWidth: 300,
      sourceHeight: 200,
      crop,
      containerWidth: 390,
      containerHeight: 500,
      mode: "adjust",
    });

    closePoint(transformPoint(geometry.sourceUvFromOutput, { x: 0, y: 0 }), {
      x: 0.1,
      y: 0.2,
    });
    closePoint(transformPoint(geometry.sourceUvFromOutput, { x: 1, y: 1 }), {
      x: 0.7,
      y: 0.7,
    });
  });

  it("maps asymmetric corners correctly after a clockwise rotation", () => {
    const crop = createDefaultCrop();
    crop.rotation = 90;
    const geometry = computeRenderGeometry({
      sourceWidth: 300,
      sourceHeight: 200,
      crop,
      containerWidth: 390,
      containerHeight: 500,
      mode: "adjust",
    });

    closePoint(transformPoint(geometry.sourceUvFromOutput, { x: 0, y: 0 }), {
      x: 0,
      y: 1,
    });
    closePoint(transformPoint(geometry.sourceUvFromOutput, { x: 1, y: 0 }), {
      x: 0,
      y: 0,
    });
    expect(geometry.outputSize).toEqual({ width: 200, height: 300 });
  });

  it("uses one invertible transform for crop overlay and drawing", () => {
    const crop = createDefaultCrop();
    crop.rotation = 270;
    crop.flipX = true;
    crop.flipY = true;
    crop.straighten = 8;
    const geometry = computeRenderGeometry({
      sourceWidth: 300,
      sourceHeight: 200,
      crop,
      containerWidth: 844,
      containerHeight: 390,
      mode: "crop",
    });
    const source = { x: 0.21, y: 0.73 };
    const output = transformPoint(geometry.outputUvFromSource, source);
    closePoint(transformPoint(geometry.sourceUvFromOutput, output), source);
    expect(geometry.outputSize.width).toBeGreaterThan(200);
    expect(geometry.outputSize.height).toBeGreaterThan(300);
  });

  it("reports actual dimensions after export capability reduction", () => {
    const dimensions = constrainExportDimensions(
      { width: 12000, height: 8000 },
      8192,
    );
    expect(dimensions.reduced).toBe(true);
    expect(dimensions.requested).toEqual({ width: 12000, height: 8000 });
    expect(Math.max(dimensions.actual.width, dimensions.actual.height)).toBeLessThanOrEqual(
      8192,
    );
    expect(dimensions.actual.width * dimensions.actual.height * 8).toBeLessThanOrEqual(
      256 * 1024 * 1024,
    );
  });
});
