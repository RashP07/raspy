import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { BandedJpegEncoder } from "./jpegEncoder";

/**
 * Every claim here is checked by decoding the output with libjpeg (through
 * sharp). Structural assertions alone would pass on a file no decoder accepts,
 * which is the only failure mode that actually matters for an encoder.
 */

type Pixel = [number, number, number];

function fill(
  width: number,
  height: number,
  at: (x: number, y: number) => Pixel,
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = at(x, y);
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

/** Encodes in `bandRows`-tall chunks, the way the worker feeds it. */
function encodeBanded(
  width: number,
  height: number,
  rgba: Uint8Array,
  quality: number,
  bandRows: number,
): Buffer {
  const encoder = new BandedJpegEncoder({ width, height, quality });
  for (let y = 0; y < height; y += bandRows) {
    const rows = Math.min(bandRows, height - y);
    encoder.addRows(rgba.subarray(y * width * 4, (y + rows) * width * 4), rows);
  }
  return Buffer.from(encoder.finish());
}

async function decode(jpeg: Buffer) {
  const { data, info } = await sharp(jpeg)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    pixel(x: number, y: number): Pixel {
      const i = (y * info.width + x) * info.channels;
      return [data[i]!, data[i + 1]!, data[i + 2]!];
    },
  };
}

const near = (actual: Pixel, expected: Pixel, tolerance: number) => {
  for (let c = 0; c < 3; c++) {
    expect(Math.abs(actual[c] - expected[c])).toBeLessThanOrEqual(tolerance);
  }
};

describe("BandedJpegEncoder", () => {
  it("produces a file libjpeg reads at the declared size", async () => {
    const width = 64;
    const height = 48;
    const jpeg = encodeBanded(
      width,
      height,
      fill(width, height, () => [120, 90, 200]),
      0.9,
      16,
    );

    const image = await decode(jpeg);
    expect(image.width).toBe(width);
    expect(image.height).toBe(height);
    expect(image.channels).toBe(3);
  });

  it("round-trips a flat colour", async () => {
    const jpeg = encodeBanded(32, 32, fill(32, 32, () => [200, 100, 50]), 0.92, 16);
    const image = await decode(jpeg);
    near(image.pixel(16, 16), [200, 100, 50], 2);
    near(image.pixel(0, 0), [200, 100, 50], 2);
    near(image.pixel(31, 31), [200, 100, 50], 2);
  });

  it("keeps a gradient faithful across the whole frame", async () => {
    const width = 96;
    const height = 96;
    const at = (x: number, y: number): Pixel => [
      Math.round((x / (width - 1)) * 255),
      Math.round((y / (height - 1)) * 255),
      128,
    ];
    const jpeg = encodeBanded(width, height, fill(width, height, at), 0.95, 16);
    const image = await decode(jpeg);

    for (const [x, y] of [
      [0, 0],
      [95, 0],
      [0, 95],
      [95, 95],
      [48, 48],
      [12, 77],
    ]) {
      near(image.pixel(x!, y!), at(x!, y!), 8);
    }
  });

  it("gives the same bytes whatever the band size", () => {
    const rgba = fill(80, 80, (x, y) => [(x * 3) % 256, (y * 5) % 256, 64]);
    const whole = encodeBanded(80, 80, rgba, 0.9, 80);
    const banded = encodeBanded(80, 80, rgba, 0.9, 16);
    const ragged = encodeBanded(80, 80, rgba, 0.9, 7);
    expect(banded.equals(whole)).toBe(true);
    expect(ragged.equals(whole)).toBe(true);
  });

  it("handles dimensions that are not multiples of the MCU", async () => {
    // 37×21 leaves partial MCUs on both edges — the case that reliably breaks
    // an encoder that assumes its padding is invisible.
    const at = (x: number, y: number): Pixel => [
      x < 18 ? 230 : 30,
      y < 10 ? 230 : 30,
      90,
    ];
    const jpeg = encodeBanded(37, 21, fill(37, 21, at), 0.95, 16);
    const image = await decode(jpeg);

    expect(image.width).toBe(37);
    expect(image.height).toBe(21);
    near(image.pixel(2, 2), at(2, 2), 12);
    near(image.pixel(36, 20), at(36, 20), 12);
    near(image.pixel(36, 2), at(36, 2), 12);
  });

  it("spends fewer bytes at lower quality", () => {
    const rgba = fill(64, 64, (x, y) => [(x * 7) % 256, (y * 11) % 256, 200]);
    const high = encodeBanded(64, 64, rgba, 0.95, 16);
    const low = encodeBanded(64, 64, rgba, 0.4, 16);
    expect(low.length).toBeLessThan(high.length);
  });

  it("survives content that forces 0xFF into the entropy stream", async () => {
    // High-frequency noise is what produces long Huffman codes, and a 0xFF
    // byte inside them has to be stuffed or every decoder loses sync.
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 256;
    };
    const rgba = fill(128, 64, () => [random(), random(), random()]);
    const jpeg = encodeBanded(128, 64, rgba, 1, 16);
    const image = await decode(jpeg);
    expect(image.width).toBe(128);
    expect(image.height).toBe(64);
  });

  it("completes an image whose rows ran out early", async () => {
    const encoder = new BandedJpegEncoder({
      width: 32,
      height: 64,
      quality: 0.9,
    });
    const rgba = fill(32, 16, () => [10, 220, 60]);
    encoder.addRows(rgba, 16);
    expect(encoder.remainingRows).toBe(48);

    const image = await decode(Buffer.from(encoder.finish()));
    expect(image.height).toBe(64);
    // The last row it was given is what fills the rest.
    near(image.pixel(16, 63), [10, 220, 60], 3);
  });
});
