/**
 * Small UI sound system. One AudioContext, one master gain, a handful of
 * voices. Everything is synthesised — no assets to cache, which keeps the
 * service worker shell as small as it was.
 */

import { readStoredSound, SOUND_EVENT } from "@/app/lib/sound";

/** Single place to trim the overall level if the cues sit too loud or quiet. */
const MASTER_GAIN = 0.5;

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let lastTickMs = 0;

if (typeof window !== "undefined") {
  enabled = readStoredSound();
  window.addEventListener(SOUND_EVENT, () => {
    enabled = readStoredSound();
  });
}

/**
 * iOS mutes a plain AudioContext whenever the ring/silent switch is set to
 * silent. Declaring the session as playback opts these cues out of that, which
 * is the difference between the ticks working on an iPhone and not.
 */
function configureSession(): void {
  try {
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    if (session) session.type = "playback";
  } catch {
    // Not supported outside Safari 16.4+; the cues still play unsilenced.
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
      configureSession();
      audioCtx = new Ctx();
      master = audioCtx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(audioCtx.destination);
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
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
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

  if (ctx.state === "suspended") {
    // Resume and still schedule: bailing out here swallowed the first cue of
    // every session, which is the one that tells you sound is on at all.
    void ctx.resume().catch(() => {});
  }

  try {
    for (const voice of voices) {
      const t0 = ctx.currentTime + (voice.delay ?? 0);
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
  play([
    {
      freq: [accent ? 1680 : 1180],
      peak: accent ? 0.09 : 0.055,
      duration: accent ? 0.028 : 0.016,
    },
  ]);
}

/** Picking one option out of a row — adjustment chips, aspect ratios. */
export function playSelect(): void {
  play([{ freq: [920], peak: 0.05, duration: 0.022, type: "sine" }]);
}

/** A larger context switch: the Adjust / Crop segmented control. */
export function playModeChange(): void {
  play([
    { freq: [560, 760], peak: 0.06, duration: 0.05 },
    { freq: [1120], peak: 0.02, duration: 0.03, type: "sine" },
  ]);
}

/** Two rising notes when an export finishes. The one earned flourish. */
export function playConfirm(): void {
  play([
    { freq: [880], peak: 0.05, duration: 0.09, type: "sine" },
    { freq: [1320], peak: 0.045, duration: 0.13, type: "sine", delay: 0.085 },
  ]);
}
