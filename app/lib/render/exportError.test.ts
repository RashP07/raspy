import { describe, expect, it } from "vitest";
import {
  describeExportFailure,
  ExportError,
  isRetryableExportFailure,
} from "./exportError";

describe("isRetryableExportFailure", () => {
  it("retries the size-shaped failures", () => {
    for (const code of ["encode", "memory", "webgl", "unknown"] as const) {
      expect(isRetryableExportFailure(new ExportError(code, "x", "y"))).toBe(
        true,
      );
    }
  });

  it("stops on failures a smaller size cannot change", () => {
    // A decode runs before a single output pixel is allocated, and a missing
    // codec is missing at every size — walking the ladder over either one only
    // buries the real reason.
    for (const code of ["format", "decode"] as const) {
      expect(isRetryableExportFailure(new ExportError(code, "x", "y"))).toBe(
        false,
      );
    }
  });

  it("never retries an abort", () => {
    expect(
      isRetryableExportFailure(new DOMException("Aborted", "AbortError")),
    ).toBe(false);
  });

  it("retries anything it does not recognise", () => {
    expect(isRetryableExportFailure(new Error("gl went away"))).toBe(true);
  });
});

describe("describeExportFailure", () => {
  it("shows the message the failure attached, not its internals", () => {
    const error = new ExportError(
      "decode",
      "createImageBitmap: unsupported source",
      "This photo couldn't be re-opened to save it.",
    );
    expect(describeExportFailure(error)).toEqual({
      title: "Couldn't save photo",
      description: "This photo couldn't be re-opened to save it.",
    });
  });
});
