"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { MenuPopover } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  SettingsIcon,
  ThemeDarkIcon,
  ThemeLightIcon,
  ThemeSystemIcon,
} from "@/components/ui/icons";
import { playSelect, unlockTickAudio } from "@/app/lib/audio/tick";
import {
  readStoredSound,
  setSound,
  SOUND_EVENT,
  SOUND_STORAGE_KEY,
} from "@/app/lib/sound";
import {
  applyTheme,
  isThemePreference,
  readStoredTheme,
  storeTheme,
  syncThemeColorMeta,
  THEME_ORDER,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/app/lib/theme";

const THEME_EVENT = "raspy:themechange";

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};

const THEME_ICONS: Record<ThemePreference, typeof ThemeSystemIcon> = {
  system: ThemeSystemIcon,
  light: ThemeLightIcon,
  dark: ThemeDarkIcon,
};

function subscribeTo(eventName: string) {
  return (onStoreChange: () => void) => {
    window.addEventListener(eventName, onStoreChange);
    return () => window.removeEventListener(eventName, onStoreChange);
  };
}

/** <html data-theme> is the source of truth; the pre-paint script sets it. */
function themeSnapshot(): ThemePreference {
  const attribute = document.documentElement.dataset.theme;
  return isThemePreference(attribute) ? attribute : "system";
}

export function SettingsMenu() {
  const theme = useSyncExternalStore(
    subscribeTo(THEME_EVENT),
    themeSnapshot,
    () => "system" as ThemePreference,
  );
  const soundOn = useSyncExternalStore(
    subscribeTo(SOUND_EVENT),
    readStoredSound,
    () => true,
  );

  useEffect(() => {
    if (theme !== "system") return;
    // Following the OS means tracking it for as long as the app is open.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => syncThemeColorMeta(query.matches ? "dark" : "light");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [theme]);

  // Another tab changing a preference should not leave this one stale.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        applyTheme(readStoredTheme());
        window.dispatchEvent(new Event(THEME_EVENT));
      }
      if (event.key === null || event.key === SOUND_STORAGE_KEY) {
        window.dispatchEvent(new Event(SOUND_EVENT));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pickTheme = (next: ThemePreference) => {
    applyTheme(next);
    storeTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
    unlockTickAudio();
    playSelect();
  };

  return (
    <MenuPopover
      title="Settings"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="se-control text-fg"
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-caption font-medium tracking-label text-muted uppercase">
            Appearance
          </h2>
          <div
            role="radiogroup"
            aria-label="Appearance"
            className="flex gap-1 rounded-control bg-track p-1"
          >
            {THEME_ORDER.map((option) => {
              const active = theme === option;
              const Icon = THEME_ICONS[option];
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => pickTheme(option)}
                  className={cnTab(active)}
                >
                  <Icon />
                  {THEME_LABELS[option]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex items-center justify-between gap-4">
          <label
            htmlFor="setting-sound"
            className="flex flex-col text-body font-medium"
          >
            Sound &amp; haptics
            <span className="text-caption font-normal text-muted">
              Ticks and clicks while editing
            </span>
          </label>
          <Switch
            id="setting-sound"
            checked={soundOn}
            onCheckedChange={(next) => {
              setSound(next);
              // This toggle is the user gesture that lets the context start,
              // and the cue previews what was just switched on.
              if (next) {
                unlockTickAudio();
                playSelect();
              }
            }}
          />
        </section>
      </div>
    </MenuPopover>
  );
}

function cnTab(active: boolean): string {
  return [
    "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-inset px-2",
    "text-caption font-medium transition-[color,background-color] duration-150 ease-out",
    active ? "bg-raised text-active shadow-raised" : "text-muted hover:text-fg",
  ].join(" ");
}
