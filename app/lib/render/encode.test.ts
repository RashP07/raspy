// @vitest-environment jsdom
// The probe reaches for `document.createElement("canvas")`, so this one file
// needs a DOM even though nothing in it renders.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCanvas, resetFormatSupportCache } from "./encode";
import { ExportError } from "./exportError";

type Encoder = (type: string) => Blob | null;

/**
 * A canvas that encodes exactly how the test says. jsdom's real one throws
 * from `toBlob`, which is indistinguishable from the failure under test.
 */
function fakeCanvas(encode: Encoder, size = 4000): HTMLCanvasElement {
  return {
    width: size,
    height: size * 0.75,
    toBlob(callback: BlobCallback, type: string) {
      callback(encode(type));
    },
  } as unknown as HTMLCanvasElement;
}

function blobOf(type: string): Blob {
  return new Blob(["x"], { type });
}

let probeEncoder: Encoder = (type) => blobOf(type);

beforeEach(() => {
  resetFormatSupportCache();
  vi.spyOn(document, "createElement").mockImplementation(
    (tag: string) =>
      (tag === "canvas"
        ? fakeCanvas((type) => probeEncoder(type), 1)
        : {}) as HTMLElement,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  probeEncoder = (type) => blobOf(type);
  resetFormatSupportCache();
});

describe("encodeCanvas", () => {
  it("returns the requested format when the browser supports it", async () => {
    const result = await encodeCanvas(
      fakeCanvas((type) => blobOf(type)),
      "image/webp",
      0.9,
    );
    expect(result.format).toBe("image/webp");
    expect(result.blob.type).toBe("image/webp");
  });

  it("falls back to JPEG when the browser cannot encode WebP", async () => {
    // The spec says an unsupported type is silently substituted with PNG.
    probeEncoder = (type) =>
      type === "image/webp" ? blobOf("image/png") : blobOf(type);
    const result = await encodeCanvas(
      fakeCanvas((type) =>
        type === "image/webp" ? blobOf("image/png") : blobOf(type),
      ),
      "image/webp",
      0.9,
    );
    expect(result.format).toBe("image/jpeg");
  });

  it("raises a retryable encode failure when toBlob yields nothing", async () => {
    const error = await encodeCanvas(
      fakeCanvas(() => null),
      "image/jpeg",
      0.9,
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ExportError);
    expect((error as ExportError).code).toBe("encode");
    expect((error as ExportError).userMessage).toMatch(/smaller size/i);
  });

  it("reports the substituted format so the file gets the right name", async () => {
    probeEncoder = (type) => blobOf(type);
    const result = await encodeCanvas(
      fakeCanvas(() => blobOf("image/png")),
      "image/webp",
      0.9,
    );
    expect(result.format).toBe("image/png");
  });
});
