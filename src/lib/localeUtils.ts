import { enGB, hi, ru } from "date-fns/locale";

export const intlLocale = (lang?: string) =>
  lang?.startsWith("ru") ? "ru-RU" : lang?.startsWith("hi") ? "hi-IN" : "en-GB";

export const dateFnsLocale = (lang?: string) =>
  lang?.startsWith("ru") ? ru : lang?.startsWith("hi") ? hi : enGB;

export type DayPart = "morning" | "afternoon" | "evening" | "night";

export const dayPart = (date: Date = new Date()): DayPart => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
};

export const formatToday = (lang?: string, date: Date = new Date()) =>
  new Intl.DateTimeFormat(intlLocale(lang), { weekday: "long", day: "numeric", month: "long" }).format(date);