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

function reportedMemoryGb(): number | null {
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
