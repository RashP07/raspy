/**
 * Typed export failures.
 *
 * The renderer throws plenty of things — raw shader logs, "2D context
 * unavailable", a worker's serialized message — and none of them are safe to
 * show a person. Wrapping the ones we understand lets the editor say something
 * true and actionable, and lets the retry ladder tell "try again smaller" apart
 * from "trying again will not help".
 */

export type ExportFailureCode =
  /** `toBlob` / `convertToBlob` produced nothing. Usually size, always opaque. */
  | "encode"
  /** A canvas or context could not be allocated. */
  | "memory"
  /** The browser cannot encode the requested format at all. */
  | "format"
  /** Adjustments need WebGL and it is gone; a smaller canvas may still get one. */
  | "webgl"
  | "unknown";

export class ExportError extends Error {
  readonly code: ExportFailureCode;
  /** Safe to render verbatim in a toast. */
  readonly userMessage: string;

  constructor(
    code: ExportFailureCode,
    message: string,
    userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ExportError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

/**
 * Whether retrying at a smaller size is worth a shot. Everything except a
 * format the browser flatly cannot encode gets another attempt: the failures
 * we see on Android are memory-shaped, and memory-shaped failures respond to
 * fewer pixels.
 */
export function isRetryableExportFailure(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  if (error instanceof ExportError) return error.code !== "format";
  // Unrecognized failures come from the worker or the GL driver, both of which
  // fail more often at large sizes than small ones.
  return true;
}

/** Toast copy for a failed export. */
export function describeExportFailure(error: unknown): {
  title: string;
  description: string;
} {
  if (error instanceof ExportError) {
    return { title: "Couldn't save photo", description: error.userMessage };
  }
  return {
    title: "Couldn't save photo",
    description:
      "Something went wrong while saving. Close other tabs and try again, or pick a smaller size.",
  };
}
