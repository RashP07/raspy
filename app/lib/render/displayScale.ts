/**
 * Backing-store scale for anything drawn to a canvas on screen.
 *
 * Every on-screen canvas — the photo and the crop overlay — has to agree on
 * this, or the overlay's hairlines resolve at a different density than the
 * photo under them and the two read as belonging to different images.
 *
 * The cap is 3 because that is where real hardware stops: phones top out at
 * 3x, and the values above it come from browser zoom or a stale ratio after a
 * monitor switch, where paying 4x the fill rate and memory buys nothing. It
 * used to be 2, which left every 3x phone upscaling a 2x buffer — invisible on
 * a photograph, obvious on the crop border's 2px lines.
 */
export const MAX_DISPLAY_SCALE = 3;

/**
 * What a constrained device gets instead. A 3x buffer for a full-screen
 * viewport runs ~10MB per canvas and there are two of them, live-redrawn on
 * every slider frame — enough to push a cheap phone into swapping or an
 * out-of-memory tab reload. Staying legible is worth more than staying sharp.
 */
export const LOW_POWER_DISPLAY_SCALE = 1;

interface DeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean };
}

/**
 * Deliberately conservative. A false positive permanently softens the whole
 * editor on a device that could have handled it, which is far more damaging
 * than a false negative, so a device has to look constrained on more than one
 * axis before it is downgraded.
 *
 * `deviceMemory` is Chromium-only and `saveData` nearly so; Safari offers
 * neither, so iOS is judged on core count alone and effectively never
 * downgrades. That is the right outcome — even old iPhones have the GPU for
 * this — but it does mean this is a floor, not a complete picture.
 */
function detectLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const hints = navigator as Navigator & DeviceHints;

  // An explicit user request to conserve, so honour it without second-guessing.
  if (hints.connection?.saveData === true) return true;

  const memory = hints.deviceMemory;
  const cores = hints.hardwareConcurrency;
  const lowMemory = typeof memory === "number" && memory <= 2;
  const lowCores = typeof cores === "number" && cores <= 2;

  // Either signal on its own only counts when it is at the bottom of its range.
  if (lowMemory || lowCores) return true;

  // Middling on both at once is the budget-phone signature. Middling on one
  // with the other unknown is not enough to act on.
  return (
    typeof memory === "number" &&
    typeof cores === "number" &&
    memory <= 4 &&
    cores <= 4
  );
}

// Hardware does not change mid-session, and this is read on every rendered
// frame, so resolve it once — lazily, since `navigator` is absent during SSR.
let lowPower: boolean | null = null;

export function isLowPowerDevice(): boolean {
  if (lowPower === null) lowPower = detectLowPower();
  return lowPower;
}

export function displayScale(): number {
  if (typeof window === "undefined") return 1;
  if (isLowPowerDevice()) return LOW_POWER_DISPLAY_SCALE;
  const ratio = window.devicePixelRatio || 1;
  // Guard against 0/NaN from headless and very old browsers.
  return ratio > 0 ? Math.min(ratio, MAX_DISPLAY_SCALE) : 1;
}
