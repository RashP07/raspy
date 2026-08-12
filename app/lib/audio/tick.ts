/**
 * Small UI sound system. One AudioContext, one master gain, a handful of
 * voices. Everything is synthesised — no assets to cache, which keeps the
 * service worker shell as small as it was.
 *
 * Phones are the hard case: their speakers are small and the cues are a few
 * tens of milliseconds long, so anything mixed for a laptop simply is not
 * there. Levels here are set for a phone at half volume; a desktop hears them
 * as a soft click. Nothing in here needs a permission prompt — the Web Audio
 * API has none — it needs a user gesture, which `unlockTickAudio` supplies.
 */

import { readStoredSound, SOUND_EVENT } from "@/app/lib/sound";

/** Single place to trim the overall level if the cues sit too loud or quiet. */
const MASTER_GAIN = 0.9;

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
/** iOS only: the element that carries our mix past the ring/silent switch. */
let mediaTap: HTMLAudioElement | null = null;
let enabled = true;
let lastTickMs = 0;
let lastHapticMs = 0;

if (typeof window !== "undefined") {
  enabled = readStoredSound();
  window.addEventListener(SOUND_EVENT, () => {
    enabled = readStoredSound();
    if (enabled) unlockTickAudio();
  });
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports as a Mac; the touch points are what give it away.
  return (
    /iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * iOS mutes a plain AudioContext whenever the ring/silent switch is set to
 * silent. Declaring the session as playback opts these cues out of that, which
 * is the difference between the ticks working on an iPhone and not.
 *
 * Returns whether the declaration took: Safari before 16.4 has no audioSession
 * at all, and there the only way past the switch is the media-element tap.
 */
function configureSession(): boolean {
  try {
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    if (!session) return false;
    session.type = "playback";
    return true;
  } catch {
    return false;
  }
}

/**
 * Older iOS has no audioSession, and there a bare AudioContext is silenced by
 * the hardware switch no matter what. Audio that leaves through an <audio>
 * element is treated as media playback instead, so route the same mix through
 * one as well. Both paths carry identical signal; on a 20ms click the doubling
 * reads as a slightly firmer tick, not as an echo.
 */
function attachMediaTap(ctx: AudioContext, out: GainNode): void {
  if (mediaTap || typeof ctx.createMediaStreamDestination !== "function")
    return;
  try {
    const dest = ctx.createMediaStreamDestination();
    out.connect(dest);
    const el = new Audio();
    el.srcObject = dest.stream;
    el.setAttribute("playsinline", "");
    el.preload = "auto";
    el.volume = 1;
    mediaTap = el;
  } catch {
    // No MediaStream support: the direct output is all we have.
    mediaTap = null;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      const hasSession = configureSession();
      audioCtx = new Ctx();
      master = audioCtx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(audioCtx.destination);
      if (!hasSession && isIOS()) attachMediaTap(audioCtx, master);
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Reduced motion is deliberately not consulted: it asks for less movement, not
 * less sound, and treating them as one silenced every cue for the many people
 * who run Reduce Motion permanently. Muting is its own preference.
 */
function shouldMute(): boolean {
  if (typeof document === "undefined") return true;
  return !enabled || document.hidden;
}

/** Call from a pointer/key handler: browsers only resume on a user gesture. */
export function unlockTickAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  // "interrupted" is an iOS-only state, entered after a call or Siri; it
  // resumes the same way but never reports itself as suspended.
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  if (mediaTap && mediaTap.paused) void mediaTap.play().catch(() => {});
}

/**
 * Short, low-energy haptics alongside the cue. Android answers navigator
 * .vibrate; iOS Safari ignores it, which is why the audio above has to carry
 * the feedback there. No permission is involved on either.
 */
function haptic(pattern: number | number[], minGapMs = 0): void {
  if (shouldMute()) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const now = performance.now();
  if (minGapMs > 0 && now - lastHapticMs < minGapMs) return;
  lastHapticMs = now;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Blocked by a permissions policy, or the page has never been touched.
  }
}

interface Voice {
  /** Frequency ramp, in Hz. A single entry holds a steady pitch. */
  freq: number[];
  peak: number;
  duration: number;
  type?: OscillatorType;
  /** Seconds to wait before this partial sounds. */
  delay?: number;
}

function play(voices: Voice[]): void {
  if (shouldMute()) return;
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state !== "running") {
    // Resume and still schedule: bailing out here swallowed the first cue of
    // every session, which is the one that tells you sound is on at all.
    void ctx.resume().catch(() => {});
  }

  try {
    // A context that was suspended has a frozen currentTime, so scheduling at
    // it lands in the past the instant it resumes and the cue never sounds.
    // The lookahead is below the threshold where a click reads as delayed.
    const base = ctx.currentTime + 0.012;
    for (const voice of voices) {
      const t0 = base + (voice.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = voice.type ?? "triangle";

      osc.frequency.setValueAtTime(voice.freq[0], t0);
      voice.freq.slice(1).forEach((hz, i) => {
        osc.frequency.exponentialRampToValueAtTime(
          hz,
          t0 + (voice.duration * (i + 1)) / (voice.freq.length - 1),
        );
      });

      // Exponential ramps cannot reach zero, hence the near-silent floor.
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(voice.peak, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + voice.duration);

      osc.connect(gain);
      gain.connect(master ?? ctx.destination);
      osc.start(t0);
      osc.stop(t0 + voice.duration + 0.02);
    }
  } catch {
    // Ignore autoplay / AudioContext failures.
  }
}

/** Short click when a slider lands on a discrete step. */
export function playSliderTick(options?: { accent?: boolean }): void {
  const now = performance.now();
  if (now - lastTickMs < 14) return;
  lastTickMs = now;

  const accent = Boolean(options?.accent);
  // Two partials: a phone speaker rolls off hard below ~700Hz, so the upper
  // one is what actually carries, and the lower one gives it body on desktop.
  play([
    {
      freq: [accent ? 1680 : 1180],
      peak: accent ? 0.5 : 0.34,
      duration: accent ? 0.038 : 0.026,
    },
    {
      freq: [accent ? 840 : 590],
      peak: accent ? 0.22 : 0.15,
      duration: accent ? 0.03 : 0.02,
      type: "sine",
    },
  ]);
  // Every step would be a continuous buzz on a fast scrub; this thins it to a
  // texture you feel without it becoming one long rumble.
  haptic(accent ? 12 : 6, 45);
}

/** Picking one option out of a row — adjustment chips, aspect ratios. */
export function playSelect(): void {
  play([{ freq: [920], peak: 0.32, duration: 0.032, type: "sine" }]);
  haptic(10);
}

/** A larger context switch: the Adjust / Crop segmented control. */
export function playModeChange(): void {
  play([
    { freq: [560, 760], peak: 0.36, duration: 0.06 },
    { freq: [1120], peak: 0.14, duration: 0.04, type: "sine" },
  ]);
  haptic([0, 14]);
}

/** Two rising notes when an export finishes. The one earned flourish. */
export function playConfirm(): void {
  play([
    { freq: [880], peak: 0.34, duration: 0.1, type: "sine" },
    { freq: [1320], peak: 0.3, duration: 0.14, type: "sine", delay: 0.085 },
  ]);
  haptic([0, 16, 70, 24]);
}
