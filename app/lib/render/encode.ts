/**
 * Canvas encoding, with the two fallbacks the platform makes necessary.
 *
 * Runs on the main thread and in the export worker, so it takes either canvas
 * flavour and touches no DOM beyond the one it is handed.
 *
 * 1. Format: a browser that cannot encode the requested type is required to
 *    substitute PNG *silently*, which would hand someone a 40 MB file named
 *    `.webp`. We detect that and pick a format the browser actually has.
 * 2. Encode failure: `toBlob` reports "no" by passing `null` — no error, no
 *    reason. That becomes an {@link ExportError} the retry ladder understands.
 */

import { ExportError } from "./exportError";
import type { ExportOptions } from "@/app/lib/editor/types";

export type ExportFormat = ExportOptions["format"];

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface EncodedImage {
  blob: Blob;
  /** What was actually encoded, which is not always what was asked for. */
  format: ExportFormat;
}

/** Formats to try, in order, when the requested one is unavailable. */
const FALLBACKS: Record<ExportFormat, ExportFormat[]> = {
  // WebP is a size optimization; JPEG is the same trade with universal support.
  "image/webp": ["image/jpeg"],
  // JPEG and PNG are baseline everywhere. If one of them fails it is memory,
  // not codec support, and swapping formats would only change how the image
  // looks — PNG carries the transparency the pipeline can produce.
  "image/jpeg": [],
  "image/png": [],
};

const support = new Map<ExportFormat, Promise<boolean>>();

/** Test seam: the probe result is cached for the life of the page. */
export function resetFormatSupportCache(): void {
  support.clear();
}

function isOffscreen(canvas: AnyCanvas): canvas is OffscreenCanvas {
  return typeof OffscreenCanvas !== "undefined" &&
    canvas instanceof OffscreenCanvas;
}

function createProbeCanvas(): AnyCanvas | null {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(1, 1);
  return null;
}

/**
 * Whether this browser can encode `format`. Probed once with a 1×1 canvas and
 * cached — the answer is a property of the build, not of the image.
 */
export function supportsExportFormat(format: ExportFormat): Promise<boolean> {
  const cached = support.get(format);
  if (cached) return cached;
  const probe = (async () => {
    const canvas = createProbeCanvas();
    if (!canvas) return true; // Nothing to probe with; let the encode decide.
    try {
      const blob = await rawEncode(canvas, format, 0.8);
      return blob !== null && blob.type === format;
    } catch {
      return false;
    }
  })();
  support.set(format, probe);
  return probe;
}

function rawEncode(
  canvas: AnyCanvas,
  format: ExportFormat,
  quality: number,
): Promise<Blob | null> {
  // PNG ignores quality, and passing one makes some engines reject the call.
  const q = format === "image/png" ? undefined : quality;
  if (isOffscreen(canvas)) {
    return canvas
      .convertToBlob({ type: format, quality: q })
      .catch(() => null);
  }
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), format, q);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Encode `canvas`, falling back on format when the browser lacks the codec.
 * Throws {@link ExportError} rather than returning null so the caller can tell
 * "no codec" (retrying is pointless) from "encode failed" (retry smaller).
 */
export async function encodeCanvas(
  canvas: AnyCanvas,
  format: ExportFormat,
  quality: number,
): Promise<EncodedImage> {
  // A format the probe rejected goes last, not first: asking for it anyway
  // would get a silent PNG substitution back, and a PNG is a worse answer than
  // the JPEG the fallback list is offering. It stays on the list because a
  // substituted image still beats no image at all.
  const candidates: ExportFormat[] = (await supportsExportFormat(format))
    ? [format]
    : [...FALLBACKS[format], format];

  let lastFailure: ExportError | null = null;
  for (const candidate of candidates) {
    const blob = await rawEncode(canvas, candidate, quality);
    if (!blob) {
      lastFailure = new ExportError(
        "encode",
        `Encoding ${candidate} at ${canvas.width}×${canvas.height} produced no data`,
        "This size was too large for your browser to encode. Try a smaller size.",
      );
      continue;
    }
    // A substituted type means the browser quietly re-encoded as something
    // else; report what it really produced so the file gets the right name.
    const actual = (blob.type || candidate) as ExportFormat;
    return { blob, format: actual in FALLBACKS ? actual : candidate };
  }

  throw (
    lastFailure ??
    new ExportError(
      "format",
      `No usable encoder for ${format}`,
      "Your browser can't save that format. Try JPEG.",
    )
  );
}
