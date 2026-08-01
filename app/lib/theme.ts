export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "simplyedit:theme";

/** Cycle order for the toolbar toggle. */
export const THEME_ORDER: ThemePreference[] = ["system", "light", "dark"];

/** Kept in step with --se-chrome, which is what sits behind the browser bar. */
export const THEME_COLORS: Record<"light" | "dark", string> = {
  light: "#f2f2f4",
  dark: "#0b0b0c",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function nextTheme(current: ThemePreference): ThemePreference {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") return prefersDark() ? "dark" : "light";
  return preference;
}

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/**
 * Points every theme-color meta at one color. Next renders a light/dark pair,
 * so an explicit override has to overwrite both — otherwise the browser keeps
 * matching on the OS setting and the address bar disagrees with the app.
 */
export function syncThemeColorMeta(resolved: "light" | "dark"): void {
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  metas.forEach((meta) => {
    meta.content = THEME_COLORS[resolved];
  });
}

export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
  syncThemeColorMeta(resolveTheme(preference));
}

export function storeTheme(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or a full quota — the theme still applies for this session.
  }
}

/**
 * Runs in <head> before first paint so a stored override never flashes the
 * wrong palette. Deliberately dependency-free: it is inlined as a string.
 */
export const THEME_INIT_SCRIPT = `
try {
  var pref = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (pref === "light" || pref === "dark") {
    document.documentElement.dataset.theme = pref;
    var color = pref === "dark" ? ${JSON.stringify(THEME_COLORS.dark)} : ${JSON.stringify(THEME_COLORS.light)};
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.content = color;
    });
  }
} catch (e) {}
`;
