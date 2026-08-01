export const MAX_FILE_BYTES = 75 * 1024 * 1024;
export const MAX_MEGAPIXELS = 60;
export const PREVIEW_LONG_EDGE = 2048;
export const MAX_DEVICE_PIXEL_RATIO = 2;

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class ImportError extends Error {
  constructor(
    message: string,
    readonly code:
      "TYPE" | "SIZE" | "DIMENSIONS" | "DECODE" | "HEIC_UNSUPPORTED",
  ) {
    super(message);
    this.name = "ImportError";
  }
}

async function sniffMime(file: File): Promise<string> {
  const declared = file.type.toLowerCase();
  if (ACCEPTED_TYPES.has(declared)) return declared;

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = String.fromCharCode(...header);
  if (signature.startsWith("\u0089PNG\r\n\u001a\n")) return "image/png";
  if (signature.startsWith("\u00ff\u00d8\u00ff")) return "image/jpeg";
  if (signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP") {
    return "image/webp";
  }
  if (signature.slice(4, 8) === "ftyp") {
    const brand = signature.slice(8, 12);
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) {
      return "image/heic";
    }
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  return "";
}

export async function decodeImageSource(file: File): Promise<{
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  name: string;
  bitmap: ImageBitmap | HTMLImageElement;
}> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ImportError(
      "This photo is over the 75 MB limit. Try a smaller copy.",
      "SIZE",
    );
  }

  const mimeType = await sniffMime(file);
  if (!mimeType || !ACCEPTED_TYPES.has(mimeType)) {
    throw new ImportError(
      "That file type isn't supported. Use JPEG, PNG, WebP, or HEIC.",
      "TYPE",
    );
  }

  const isHeic = mimeType === "image/heic" || mimeType === "image/heif";

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        } as ImageBitmapOptions);
      } catch {
        bitmap = await createImageBitmap(file);
      }
    } else {
      bitmap = await loadHtmlImage(file);
    }
  } catch {
    if (isHeic) {
      try {
        bitmap = await decodeHeicBlob(file);
      } catch (error) {
        if (error instanceof Error && error.message.includes("60 megapixel")) {
          throw new ImportError(error.message, "DIMENSIONS");
        }
        throw new ImportError(
          "This HEIC photo can't be opened. Try saving a JPEG copy from your photo library.",
          "HEIC_UNSUPPORTED",
        );
      }
    } else {
      throw new ImportError(
        "This photo can't be opened. Try saving a JPEG or PNG copy and opening that.",
        "DECODE",
      );
    }
  }

  const width = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const height =
    "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;

  if (!width || !height) {
    if (isHeic) {
      throw new ImportError(
        "This HEIC photo has invalid dimensions.",
        "HEIC_UNSUPPORTED",
      );
    }
    throw new ImportError(
      "This photo can't be opened. Try saving a JPEG or PNG copy and opening that.",
      "DECODE",
    );
  }

  const megapixels = (width * height) / 1_000_000;
  if (megapixels > MAX_MEGAPIXELS) {
    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
    throw new ImportError(
      "This photo is over the 60 megapixel limit. Try a smaller copy.",
      "DIMENSIONS",
    );
  }

  const preview = await resizeBitmap(bitmap, PREVIEW_LONG_EDGE);

  return {
    blob: file,
    mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
    width,
    height,
    name: file.name || "photo",
    bitmap: preview,
  };
}

async function resizeBitmap(
  source: ImageBitmap | HTMLImageElement,
  maxLongEdge: number,
): Promise<ImageBitmap | HTMLImageElement> {
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height =
    "naturalHeight" in source ? source.naturalHeight : source.height;
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge || typeof createImageBitmap !== "function") {
    return source;
  }

  const scale = maxLongEdge / longEdge;
  const resized = await createImageBitmap(source, {
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
    resizeQuality: "high",
  });
  if ("close" in source && typeof source.close === "function") source.close();
  return resized;
}

function loadHtmlImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

export async function createPreviewBitmap(
  source: Blob,
  maxLongEdge = PREVIEW_LONG_EDGE,
): Promise<ImageBitmap | HTMLImageElement> {
  let full: ImageBitmap | HTMLImageElement | undefined;

  if (typeof createImageBitmap === "function") {
    try {
      full = await createImageBitmap(source, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
    } catch {
      if (isHeicMime(source.type)) {
        full = await decodeHeicBlob(source);
      }
    }
  }

  full ??= await loadHtmlImage(source);
  return resizeBitmap(full, maxLongEdge);
}

function isHeicMime(mimeType: string): boolean {
  return mimeType === "image/heic" || mimeType === "image/heif";
}

let workerRequestId = 0;

async function decodeHeicBlob(source: Blob): Promise<ImageBitmap> {
  if (
    typeof Worker === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    throw new Error("HEIC fallback is not available in this browser.");
  }

  const worker = new Worker(
    new URL("../../workers/heic-decoder.worker.ts", import.meta.url),
    { type: "module", name: "simplyedit-heic-decoder" },
  );
  const id = ++workerRequestId;
  const sourceBuffer = await source.arrayBuffer();

  const result = await new Promise<{
    width: number;
    height: number;
    buffer: ArrayBuffer;
  }>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("HEIC decoding timed out."));
    }, 45_000);

    worker.onmessage = (
      event: MessageEvent<{
        id: number;
        width?: number;
        height?: number;
        buffer?: ArrayBuffer;
        error?: string;
      }>,
    ) => {
      if (event.data.id !== id) return;
      window.clearTimeout(timeout);
      if (
        event.data.error ||
        !event.data.buffer ||
        !event.data.width ||
        !event.data.height
      ) {
        reject(new Error(event.data.error ?? "HEIC decoding failed."));
        return;
      }
      resolve({
        width: event.data.width,
        height: event.data.height,
        buffer: event.data.buffer,
      });
    };
    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      reject(new Error(event.message || "HEIC worker failed."));
    };
    worker.postMessage({ id, buffer: sourceBuffer }, [sourceBuffer]);
  }).finally(() => worker.terminate());

  if ((result.width * result.height) / 1_000_000 > MAX_MEGAPIXELS) {
    throw new ImportError(
      "This photo is over the 60 megapixel limit. Try a smaller copy.",
      "DIMENSIONS",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray(result.buffer),
      result.width,
      result.height,
    ),
    0,
    0,
  );
  return createImageBitmap(canvas);
}
