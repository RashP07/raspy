/** Soft UI tick for slider steps. Shared AudioContext; no-ops when reduced-motion. */

let audioCtx: AudioContext | null = null;
let lastTickMs = 0;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx ??= new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function shouldMute(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return true;
  }
  if (document.hidden) return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function unlockTickAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/** Short click when a slider lands on a discrete step. */
export function playSliderTick(options?: { accent?: boolean }): void {
  if (shouldMute()) return;

  const now = performance.now();
  if (now - lastTickMs < 14) return;
  lastTickMs = now;

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
    return;
  }

  try {
    const accent = Boolean(options?.accent);
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(accent ? 1680 : 1180, t0);
    const peak = accent ? 0.038 : 0.022;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.002);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + (accent ? 0.028 : 0.016),
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.032);
  } catch {
    // Ignore autoplay / AudioContext failures.
  }
}
