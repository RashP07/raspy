import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreviewBitmap, decodeImageSource, ImportError } from "./decode";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Enough bytes to sniff, and distinguishable when read back. */
function pngBytes(): ArrayBuffer {
  const buffer = new ArrayBuffer(64);
  const bytes = new Uint8Array(buffer);
  bytes.set(PNG_MAGIC);
  bytes[63] = 0xab;
  return buffer;
}

/**
 * A File whose bytes can be pulled out from under it, the way Android revokes
 * a `content://` handle when the browser goes to the background.
 */
function revocableFile(type = "image/png"): File & { revoke(): void } {
  const file = new File([pngBytes()], "photo.png", { type }) as File & {
    revoke(): void;
  };
  const live = File.prototype.arrayBuffer.bind(file);
  let revoked = false;
  file.revoke = () => {
    revoked = true;
  };
  Object.defineProperty(file, "arrayBuffer", {
    value: () =>
      revoked
        ? Promise.reject(new DOMException("Could not read file", "NotReadableError"))
        : live(),
  });
  return file;
}

function stubDecoder(decode: (source: Blob) => unknown = () => ({
  width: 1024,
  height: 1024,
  close() {},
})) {
  vi.stubGlobal("createImageBitmap", vi.fn(async (source: Blob) => decode(source)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("decodeImageSource", () => {
  it("keeps the photo's bytes rather than the picker's handle", async () => {
    stubDecoder();
    const file = revocableFile();

    const decoded = await decodeImageSource(file);
    // The save path re-reads this blob minutes later, long after Android may
    // have taken the original handle away.
    file.revoke();

    expect(decoded.blob).not.toBe(file);
    const bytes = new Uint8Array(await decoded.blob.arrayBuffer());
    expect(bytes.length).toBe(64);
    expect(bytes[63]).toBe(0xab);
  });

  it("stamps the sniffed type on the copy, for files that arrive without one", async () => {
    stubDecoder();
    // A photo picker hands over plenty of these; an untyped blob never reaches
    // the HEIC fallback on the way back out.
    const decoded = await decodeImageSource(revocableFile(""));
    expect(decoded.blob.type).toBe("image/png");
    expect(decoded.mimeType).toBe("image/png");
  });

  it("decodes from the copy, not the original", async () => {
    const seen: Blob[] = [];
    stubDecoder((source) => {
      seen.push(source);
      return { width: 1024, height: 1024, close() {} };
    });
    const file = revocableFile();
    await decodeImageSource(file);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((source) => source !== file)).toBe(true);
  });

  it("reports a plain import failure when the handle is already dead", async () => {
    stubDecoder(() => {
      throw new DOMException("Could not read file", "NotReadableError");
    });
    const file = revocableFile();
    file.revoke();
    await expect(decodeImageSource(file)).rejects.toBeInstanceOf(ImportError);
  });
});

describe("createPreviewBitmap", () => {
  it("decodes at the size it needs when the size is known", async () => {
    const asked: ImageBitmapOptions[] = [];
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async (_source: Blob, options?: ImageBitmapOptions) => {
        asked.push(options ?? {});
        const width = options?.resizeWidth ?? 8000;
        return { width, height: Math.round(width * 0.75), close() {} };
      }),
    );

    const bitmap = await createPreviewBitmap(
      new Blob([pngBytes()], { type: "image/png" }),
      2000,
      "image/png",
      { width: 8000, height: 6000 },
    );

    // One decode, straight to size: no full-resolution bitmap in between.
    expect(asked).toHaveLength(1);
    expect(asked[0].resizeWidth).toBe(2000);
    expect(asked[0].resizeHeight).toBeUndefined();
    expect(bitmap.width).toBe(2000);
  });

  it("caps the long edge on a portrait photo", async () => {
    const asked: ImageBitmapOptions[] = [];
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async (_source: Blob, options?: ImageBitmapOptions) => {
        asked.push(options ?? {});
        const height = options?.resizeHeight ?? 8000;
        return { width: Math.round(height * 0.75), height, close() {} };
      }),
    );

    await createPreviewBitmap(
      new Blob([pngBytes()], { type: "image/png" }),
      2000,
      "image/png",
      { width: 6000, height: 8000 },
    );

    expect(asked[0].resizeHeight).toBe(2000);
    expect(asked[0].resizeWidth).toBeUndefined();
  });

  it("falls back to the plain decode when the browser refuses to scale", async () => {
    let calls = 0;
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async (_source: Blob, options?: ImageBitmapOptions) => {
        calls += 1;
        if (options?.resizeWidth || options?.resizeHeight) {
          throw new Error("resize options unsupported");
        }
        return { width: 800, height: 600, close() {} };
      }),
    );

    const bitmap = await createPreviewBitmap(
      new Blob([pngBytes()], { type: "image/png" }),
      2000,
      "image/png",
      { width: 8000, height: 6000 },
    );

    expect(calls).toBeGreaterThan(1);
    expect(bitmap.width).toBe(800);
  });
});
