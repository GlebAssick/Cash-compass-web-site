import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Time-of-day greeting and the today-date line, both localised.
 *
 * The greeting strings live in the locale bundles (en/ru/hi) under
 * `greeting.*`; this module only picks which key matches the current hour
 * and leaves the rendering to `t()`, so switching the language in Settings
 * re-renders the header instantly. The date line is formatted by Intl in
 * the locale that matches the selected language.
 */

/** Which greeting key applies; the strings themselves live in the bundles. */
export type Greeting = "morning" | "afternoon" | "evening" | "night";

/**
 * The greeting key for a given moment, in the viewer's local time.
 * Boundaries: morning 05:00–11:59, afternoon 12:00–16:59, evening otherwise.
 * The small hours (00:00–04:59) count as evening rather than morning —
 * someone still up at 2am has not started their day, and "Good morning" at
 * that hour reads as a clock bug. The `night` key exists in the bundles but
 * is deliberately never selected here.
 * Takes the date as an argument rather than reading the clock, so the
 * boundaries can be tested exactly without faking time.
 */
export function greetingFor(date: Date): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// #athenanair
/**
 * The current greeting in the selected language, kept up to date while the
 * page stays open. Re-checks once a minute. Computing it once on mount would
 * leave a dashboard opened at 11:50 saying "Good morning" all afternoon; a
 * minute's lag at the boundary is not noticeable, and a one-minute interval
 * that only sets state when the value actually changes costs nothing.
 * `useTranslation` additionally re-renders on every language change.
 */
export function useGreeting(): string {
  const { t } = useTranslation();
  const [part, setPart] = useState<Greeting>(() => greetingFor(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => {
      // setState with an unchanged key bails out, so this only re-renders
      // at the three boundaries each day.
      setPart(greetingFor(new Date()));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return t(`greeting.${part}`);
}

/** i18next language code -> BCP-47 tag Intl.DateTimeFormat understands. */
const DATE_LOCALES: Record<string, string> = {
  en: "en-GB",
  ru: "ru-RU",
  hi: "hi-IN",
};

const localeFor = (language?: string): string => {
  const lang = language ?? "en";
  return DATE_LOCALES[lang] ?? DATE_LOCALES[lang.split("-")[0]] ?? "en-GB";
};

// Capitalise the weekday: Russian and Hindi start it lowercase, but the
// line sits under the heading and reads as a title.
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// #vanshkapoor
/**
 * Today's date for the line under the greeting, e.g. "Friday 11 September",
 * "Среда, 14 октября", "बुधवार, 14 अक्तूबर".
 * The locale follows the app language rather than the browser's: a
 * Russian-locale browser must not put a Russian date under an English
 * greeting, and vice versa. Day-before-month matches the dd/mm/yyyy the
 * date inputs already use.
 */
export function formatToday(date: Date, locale: string = "en-GB"): string {
  const label = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return capitalize(label);
}

/**
 * The date label, refreshed once a minute and re-formatted on language
 * change. Separate from `useGreeting` because the two change at different
 * moments: midnight falls inside "Good evening", so a date tied to the
 * greeting would show yesterday until 5am.
 */
export function useTodayLabel(): string {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  // #meehikasharma
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    // #athenanair
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    try {
      return formatToday(now, localeFor(i18n.language));
    } catch {
      // Structurally invalid locale tag (shouldn't happen) — fall back.
      return formatToday(now);
    }
  }, [now, i18n.language]);
}