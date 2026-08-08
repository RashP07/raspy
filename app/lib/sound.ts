/**
 * Sound-effects preference. Mirrors the theme preference: localStorage plus a
 * window event so every mounted control re-reads the same source of truth.
 *
 * No pre-paint script here — unlike the theme, an unset preference has nothing
 * to flash, and nothing sounds until the user touches a control anyway.
 */

export const SOUND_STORAGE_KEY = "raspy:sound";

/** Fired on this window whenever the preference changes. */
export const SOUND_EVENT = "raspy:soundchange";

/** On unless explicitly turned off: the ruler tick is part of the feel. */
export function readStoredSound(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function storeSound(on: boolean): void {
  try {
    if (on) localStorage.removeItem(SOUND_STORAGE_KEY);
    else localStorage.setItem(SOUND_STORAGE_KEY, "off");
  } catch {
    // Private mode or a full quota — the choice still holds for this session.
  }
}

export function setSound(on: boolean): void {
  storeSound(on);
  window.dispatchEvent(new Event(SOUND_EVENT));
}
