import { describe, expect, it } from "vitest";
import { bandSourceUvMatrix, identityMat3, transformPoint } from "./geometry";

/**
 * The band mapping has to line up with two conventions at once: the vertex
 * shader's top-down output UV, and readPixels' bottom-up row order. Getting it
 * wrong produces an image that is subtly shuffled rather than obviously
 * broken, so the arithmetic is pinned here.
 */

const OUTPUT_HEIGHT = 400;
const BAND_ROWS = 64;

/** Output UV the shader hands the fragment for framebuffer row `j` of a band. */
function bandUvForRow(j: number, bandRows: number) {
  // v_outputUv.y = 1 - (ndc.y * 0.5 + 0.5), and row j sits at the centre of
  // its texel counting up from the bottom of the framebuffer.
  return 1 - (j + 0.5) / bandRows;
}

describe("bandSourceUvMatrix", () => {
  it("maps framebuffer row j of a band to output row top + j", () => {
    for (const top of [0, 64, 128, 320]) {
      const matrix = bandSourceUvMatrix(
        identityMat3(),
        top,
        BAND_ROWS,
        OUTPUT_HEIGHT,
      );
      for (const j of [0, 1, 31, 63]) {
        const mapped = transformPoint(matrix, {
          x: 0.5,
          y: bandUvForRow(j, BAND_ROWS),
        });
        expect(mapped.y * OUTPUT_HEIGHT).toBeCloseTo(top + j + 0.5, 4);
      }
    }
  });

  it("covers the full output exactly once across consecutive bands", () => {
    const rows: number[] = [];
    for (let top = 0; top < OUTPUT_HEIGHT; top += BAND_ROWS) {
      const matrix = bandSourceUvMatrix(
        identityMat3(),
        top,
        BAND_ROWS,
        OUTPUT_HEIGHT,
      );
      for (let j = 0; j < BAND_ROWS && top + j < OUTPUT_HEIGHT; j++) {
        const mapped = transformPoint(matrix, {
          x: 0.5,
          y: bandUvForRow(j, BAND_ROWS),
        });
        rows.push(Math.floor(mapped.y * OUTPUT_HEIGHT));
      }
    }
    expect(rows).toHaveLength(OUTPUT_HEIGHT);
    expect(new Set(rows).size).toBe(OUTPUT_HEIGHT);
    expect(rows[0]).toBe(0);
    expect(rows.at(-1)).toBe(OUTPUT_HEIGHT - 1);
  });

  it("leaves x untouched", () => {
    const matrix = bandSourceUvMatrix(identityMat3(), 128, BAND_ROWS, OUTPUT_HEIGHT);
    for (const x of [0, 0.25, 1]) {
      expect(transformPoint(matrix, { x, y: 0.5 }).x).toBeCloseTo(x, 6);
    }
  });

  it("a single band spanning the whole output is a vertical flip", () => {
    // Which is the point: the band renders upside down so readPixels returns
    // its rows already the right way up.
    const matrix = bandSourceUvMatrix(identityMat3(), 0, OUTPUT_HEIGHT, OUTPUT_HEIGHT);
    expect(transformPoint(matrix, { x: 0.5, y: 0 }).y).toBeCloseTo(1, 6);
    expect(transformPoint(matrix, { x: 0.5, y: 1 }).y).toBeCloseTo(0, 6);
  });
});
