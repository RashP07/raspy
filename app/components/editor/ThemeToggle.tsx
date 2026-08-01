"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  ThemeDarkIcon,
  ThemeLightIcon,
  ThemeSystemIcon,
} from "@/components/ui/icons";
import {
  applyTheme,
  isThemePreference,
  nextTheme,
  readStoredTheme,
  storeTheme,
  syncThemeColorMeta,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/app/lib/theme";

const LABELS: Record<ThemePreference, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

const THEME_EVENT = "simplyedit:themechange";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

/** <html data-theme> is the source of truth; the pre-paint script sets it. */
function getSnapshot(): ThemePreference {
  const attribute = document.documentElement.dataset.theme;
  return isThemePreference(attribute) ? attribute : "system";
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (theme !== "system") return;
    // Following the OS means tracking it for as long as the app is open.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => syncThemeColorMeta(query.matches ? "dark" : "light");
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [theme]);

  // Another tab changing the preference should not leave this one stale.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      applyTheme(readStoredTheme());
      window.dispatchEvent(new Event(THEME_EVENT));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const advance = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    storeTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const upcoming = nextTheme(theme);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="se-control text-[var(--se-fg)]"
      aria-label={`Theme: ${LABELS[theme].toLowerCase()}. Switch to ${LABELS[upcoming].toLowerCase()}.`}
      title={LABELS[theme]}
      onClick={advance}
    >
      <ThemeIcon theme={theme} />
    </Button>
  );
}

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  if (theme === "light") return <ThemeLightIcon />;
  if (theme === "dark") return <ThemeDarkIcon />;
  return <ThemeSystemIcon />;
}
