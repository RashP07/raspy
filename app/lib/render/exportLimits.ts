/**
 * Device-aware ceilings for an export, and the ladder we walk down when one
 * fails.
 *
 * The old flat 256 MB cap was a desktop number: it let a mid-range Android
 * phone attempt a ~32 megapixel canvas, which the browser accepts and then
 * fails to encode — `toBlob` hands back `null` with no error to explain it.
 * Sizing the cap to the device turns most of those failures into a smaller
 * file that actually saves.
 */

import type { ExportDimensions } from "@/app/lib/editor/types";

/**
 * Bytes per output pixel we assume an export costs. The drawing buffer is 4,
 * and the JPEG path allocates a second canvas to flatten onto white before
 * encoding, so 8 is the honest figure for the peak.
 */
const BYTES_PER_PIXEL = 8;

/** Never demand more than this even on a machine that reports plenty. */
const MAX_MEMORY_CAP = 256 * 1024 * 1024;
/** Never cut below this, or a phone photo comes out unusably small. */
const MIN_MEMORY_CAP = 96 * 1024 * 1024;
/** Budget per reported GB of device memory. */
const CAP_PER_GB = 48 * 1024 * 1024;

/** Long edge below which downscaling stops being a better answer than failing. */
export const MIN_EXPORT_LONG_EDGE = 640;

/** Successive area scales tried when an export fails. Each halves the pixels. */
const RETRY_AREA_SCALES = [0.5, 0.25];

interface DeviceMemoryNavigator extends Navigator {
  deviceMemory?: number;
}

/**
 * GB of RAM the browser admits to. Chrome — including on Android, where the
 * ceiling actually bites — reports this; Safari and Firefox do not.
 */
export function reportedMemoryGb(): number | null {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as DeviceMemoryNavigator)
      : null;
  const value = nav?.deviceMemory;
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Peak export bytes this device should be asked for. Chrome (including on
 * Android, where this matters most) reports `deviceMemory`; everywhere else we
 * keep the historical desktop cap rather than guess a device down.
 */
export function exportMemoryCap(): number {
  const gb = reportedMemoryGb();
  if (gb === null) return MAX_MEMORY_CAP;
  const cap = Math.round(gb * CAP_PER_GB);
  return Math.min(MAX_MEMORY_CAP, Math.max(MIN_MEMORY_CAP, cap));
}

/** The pixel budget behind {@link exportMemoryCap}, for messages and tests. */
export function exportPixelBudget(): number {
  return Math.floor(exportMemoryCap() / BYTES_PER_PIXEL);
}

/**
 * Why an export came out smaller than asked for, in one sentence.
 *
 * "This device can't render a larger image" was the old line, and it told
 * someone nothing they could check or act on. Both ceilings here are concrete
 * numbers, so both are worth saying out loud.
 */
export function describeExportCeiling(
  dimensions: ExportDimensions,
): string | null {
  if (dimensions.limitedBy === "dimension") {
    return `Your graphics hardware won't render an image wider than ${dimensions.maxDimension.toLocaleString()} px on the long edge.`;
  }
  if (dimensions.limitedBy === "memory") {
    const budget = formatMegapixels(dimensions.memoryCap / BYTES_PER_PIXEL);
    const gb = reportedMemoryGb();
    return gb === null
      ? `Saves are budgeted ${budget} megapixels — beyond that, browsers start failing to encode.`
      : `This device reports ${gb} GB of memory, so saves are budgeted ${budget} megapixels.`;
  }
  return null;
}

function formatMegapixels(pixels: number): string {
  const mp = pixels / 1_000_000;
  return mp >= 10 ? String(Math.round(mp)) : mp.toFixed(1);
}

/**
 * The sizes to try, largest first. The first entry is what the UI promised;
 * the rest exist only because an encode at the promised size can fail for
 * reasons no amount of feature detection predicts.
 */
export function exportAttemptLadder(size: {
  width: number;
  height: number;
}): Array<{ width: number; height: number }> {
  const ladder = [{ width: size.width, height: size.height }];
  for (const areaScale of RETRY_AREA_SCALES) {
    const scale = Math.sqrt(areaScale);
    const width = Math.max(1, Math.floor(size.width * scale));
    const height = Math.max(1, Math.floor(size.height * scale));
    if (Math.max(width, height) < MIN_EXPORT_LONG_EDGE) break;
    ladder.push({ width, height });
  }
  return ladder;
}
