/**
  Theme system, restored for the appendix screenshots (Рисунок Б.3) and for
  users who want a different palette. The original five-theme pack was removed
  together with the font-family pack; AppTour still listed "theme-toggle" as a
  step target, so the tour pointed at a button that no longer existed. This
  module brings the button — and the themes — back.

  Themes are pure CSS-variable overrides on <html>. The first theme carries an
  EMPTY vars map on purpose: applying it removes every override, so the default
  look is exactly the shipped design, byte for byte. Dark mode also flips the
  ink tokens (--ink / --hairline) that GreetingHeader uses for its shine and
  sparkle stars, otherwise black stars would vanish on a dark background.
*/
export interface ThemeDef {
  id: string;
  labelKey: string;
  swatch: string;
  vars: Record<string, string>;
}

export const THEMES: ThemeDef[] = [
  {
    id: "soft-bloom",
    labelKey: "themes.softBloom",
    swatch: "hsl(40 30% 97%)",
    vars: {},
  },
  {
    id: "midnight",
    labelKey: "themes.midnight",
    swatch: "hsl(240 10% 10%)",
    vars: {
      background: "240 10% 8%",
      foreground: "40 20% 96%",
      card: "240 9% 12%",
      "card-foreground": "40 20% 96%",
      primary: "40 20% 92%",
      "primary-foreground": "240 10% 8%",
      secondary: "240 8% 18%",
      "secondary-foreground": "40 20% 92%",
      muted: "240 8% 18%",
      "muted-foreground": "240 5% 65%",
      accent: "240 8% 22%",
      "accent-foreground": "40 20% 95%",
      border: "240 7% 22%",
      outline: "240 7% 30%",
      input: "240 7% 22%",
      ring: "40 20% 92%",
      destructive: "0 62% 55%",
      "destructive-foreground": "0 0% 100%",
      ink: "40 30% 92%",
      hairline: "240 6% 40%",
    },
  },
  {
    id: "paper",
    labelKey: "themes.paper",
    swatch: "hsl(40 40% 90%)",
    vars: {
      background: "40 40% 94%",
      foreground: "25 30% 15%",
      card: "40 45% 97%",
      "card-foreground": "25 30% 15%",
      primary: "25 45% 25%",
      "primary-foreground": "40 40% 96%",
      secondary: "40 30% 88%",
      "secondary-foreground": "25 30% 20%",
      muted: "40 30% 88%",
      "muted-foreground": "25 20% 40%",
      accent: "40 35% 84%",
      "accent-foreground": "25 30% 15%",
      border: "35 25% 80%",
      outline: "35 25% 70%",
      input: "35 25% 80%",
      ring: "25 45% 25%",
      destructive: "0 60% 45%",
      "destructive-foreground": "0 0% 100%",
      ink: "25 40% 15%",
      hairline: "35 25% 60%",
    },
  },
  {
    id: "mint",
    labelKey: "themes.mint",
    swatch: "hsl(150 30% 92%)",
    vars: {
      background: "150 25% 96%",
      foreground: "160 35% 12%",
      card: "0 0% 100%",
      "card-foreground": "160 35% 12%",
      primary: "160 45% 25%",
      "primary-foreground": "150 30% 96%",
      secondary: "150 20% 90%",
      "secondary-foreground": "160 35% 15%",
      muted: "150 20% 90%",
      "muted-foreground": "160 15% 40%",
      accent: "150 25% 86%",
      "accent-foreground": "160 35% 12%",
      border: "150 15% 82%",
      outline: "150 15% 70%",
      input: "150 15% 82%",
      ring: "160 45% 25%",
      destructive: "0 60% 45%",
      "destructive-foreground": "0 0% 100%",
      ink: "160 40% 14%",
      hairline: "150 15% 55%",
    },
  },
  {
    id: "dusk",
    labelKey: "themes.dusk",
    swatch: "hsl(260 35% 92%)",
    vars: {
      background: "260 30% 97%",
      foreground: "260 30% 15%",
      card: "0 0% 100%",
      "card-foreground": "260 30% 15%",
      primary: "260 40% 35%",
      "primary-foreground": "260 30% 97%",
      secondary: "260 25% 92%",
      "secondary-foreground": "260 30% 20%",
      muted: "260 25% 92%",
      "muted-foreground": "260 15% 45%",
      accent: "260 30% 89%",
      "accent-foreground": "260 30% 15%",
      border: "260 20% 85%",
      outline: "260 20% 72%",
      input: "260 20% 85%",
      ring: "260 40% 35%",
      destructive: "0 60% 45%",
      "destructive-foreground": "0 0% 100%",
      ink: "260 35% 18%",
      hairline: "260 20% 60%",
    },
  },
];

const THEME_KEY = "cash-compass-theme";

/** Every variable any theme touches; cleared before applying a new theme. */
const MANAGED = [
  "background", "foreground", "card", "card-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "border", "outline", "input", "ring",
  "destructive", "destructive-foreground",
  "ink", "hairline",
];

export function applyTheme(id: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const name of MANAGED) root.style.removeProperty(`--${name}`);
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0];
    for (const [name, value] of Object.entries(theme.vars)) {
    // shadcn-переменные потребляются как hsl(var(--x)), а ink/hairline — как
    // готовый цвет var(--ink). Триплеты для ink/hairline оборачиваем в hsl(),
    // иначе тёмная тема роняла градиент приветствия в невалидный цвет.
    const isColorVar = name === "ink" || name === "hairline";
    const wrapped = isColorVar && !value.startsWith("hsl(") && !value.startsWith("#") ? `hsl(${value})` : value;
    root.style.setProperty(`--${name}`, wrapped);
  }
  root.setAttribute("data-theme", theme.id);
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    // private mode etc. — theme still applies for this session
  }
}

export function readStoredTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored && THEMES.some((item) => item.id === stored)) return stored;
  } catch {
    // fall through to default
  }
  return THEMES[0].id;
}

// Apply the stored theme as early as possible so the first paint is already
// themed (no white flash before React mounts).
applyTheme(readStoredTheme());