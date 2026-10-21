import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarDays, ChevronRight, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";

type Region = "India" | "Russia";

interface CalendarEvent {
  id: string;
  type: string;
  start: Date;
  end: Date;
  nameKey?: string;
  noteKey?: string;
  name?: string;
  note?: string;
  customId?: string;
}

interface CustomEventDef {
  id: string;
  name: string;
  date: string; // yyyy-MM-dd
  type: string;
  note: string;
  repeat: "none" | "monthly";
}

const CUSTOM_EVENTS_KEY = "cash-compass-calendar-custom-v1";
const REGION_KEY = "cash-compass-region";

/**
  Region toggle = event list ONLY. It deliberately does NOT touch the interface
  language anymore: an earlier experiment drove i18n.changeLanguage from this
  toggle, which produced a row of duplicated greeting headers during language
  flips. Language now lives in the personal cabinet (PersonalCabinet), where
  the user switches it explicitly and once.
*/

// #propertyofbharat
const dateFor = (month: number, day: number, durationDays = 0) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const candidate = new Date(currentYear, month - 1, day);
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime()) candidate.setFullYear(currentYear + 1);
  const end = new Date(candidate);
  end.setDate(end.getDate() + durationDays);
  return { start: candidate, end };
};

/**
  Official and money-relevant days per region. Names and notes are i18n keys
  (eventCalendar.events.*) so holidays read in ru/en/hi. Fixed-date national
  holidays are safe to hardcode; lunar festivals (Diwali, Holi) carry
  manual-update comments because they drift each year. Personal income dates
  are intentionally NOT hardcoded: the editor lets each user add their own.
*/
export const eventData = (region: Region): CalendarEvent[] => {
  if (region === "Russia") {
    const winter = dateFor(1, 10, 18);
    const newYear = dateFor(12, 29, 9);
    return [
      { id: "ru-winter", type: "Academic", ...winter, nameKey: "eventCalendar.events.winterExam.name", noteKey: "eventCalendar.events.winterExam.note" },
      { id: "ru-new-year", type: "Holiday", ...newYear, nameKey: "eventCalendar.events.newYear.name", noteKey: "eventCalendar.events.newYear.note" },
      { id: "ru-feb23", type: "Holiday", ...dateFor(2, 23), nameKey: "eventCalendar.events.feb23.name", noteKey: "eventCalendar.events.feb23.note" },
      { id: "ru-mar8", type: "Holiday", ...dateFor(3, 8), nameKey: "eventCalendar.events.mar8.name", noteKey: "eventCalendar.events.mar8.note" },
      { id: "ru-may1", type: "Holiday", ...dateFor(5, 1), nameKey: "eventCalendar.events.may1.name", noteKey: "eventCalendar.events.may1.note" },
      { id: "ru-may9", type: "Holiday", ...dateFor(5, 9), nameKey: "eventCalendar.events.may9.name", noteKey: "eventCalendar.events.may9.note" },
      { id: "ru-jun12", type: "Holiday", ...dateFor(6, 12), nameKey: "eventCalendar.events.jun12.name", noteKey: "eventCalendar.events.jun12.note" },
      { id: "ru-nov4", type: "Holiday", ...dateFor(11, 4), nameKey: "eventCalendar.events.nov4.name", noteKey: "eventCalendar.events.nov4.note" },
    ];
  }
  const exams = dateFor(7, 18, 8);
  // Diwali follows the lunar calendar, so it is NOT a fixed Gregorian date —
  // this must be updated by hand each year. Confirmed dates:
  // 2026: November 8 (5-day cluster: Nov 5 Dhanteras – Nov 9 Bhai Dooj)
  // 2027: October 29
  const diwali = dateFor(11, 5, 4);
  const semester = dateFor(8, 1, 13);
  // Holi is lunar too. Confirmed: 2026 March 4 (Holika Dahan on March 3).
  const holi = dateFor(3, 4, 1);
  return [
    { id: "in-exams", type: "Academic", ...exams, nameKey: "eventCalendar.events.examWindow.name", noteKey: "eventCalendar.events.examWindow.note" },
    { id: "in-diwali", type: "Festival", ...diwali, nameKey: "eventCalendar.events.diwali.name", noteKey: "eventCalendar.events.diwali.note" },
    { id: "in-holi", type: "Festival", ...holi, nameKey: "eventCalendar.events.holi.name", noteKey: "eventCalendar.events.holi.note" },
    { id: "in-semester", type: "Student costs", ...semester, nameKey: "eventCalendar.events.semester.name", noteKey: "eventCalendar.events.semester.note" },
    { id: "in-republic", type: "Holiday", ...dateFor(1, 26), nameKey: "eventCalendar.events.republic.name", noteKey: "eventCalendar.events.republic.note" },
    { id: "in-independence", type: "Holiday", ...dateFor(8, 15), nameKey: "eventCalendar.events.independence.name", noteKey: "eventCalendar.events.independence.note" },
    { id: "in-gandhi", type: "Holiday", ...dateFor(10, 2), nameKey: "eventCalendar.events.gandhi.name", noteKey: "eventCalendar.events.gandhi.note" },
    { id: "in-christmas", type: "Holiday", ...dateFor(12, 25), nameKey: "eventCalendar.events.christmas.name", noteKey: "eventCalendar.events.christmas.note" },
  ];
};

const TYPE_KEYS: Record<string, string> = {
  Academic: "eventCalendar.typeAcademic",
  Holiday: "eventCalendar.typeHoliday",
  Festival: "eventCalendar.typeFestival",
  "Student costs": "eventCalendar.typeStudentCosts",
  Income: "eventCalendar.typeIncome",
  Personal: "eventCalendar.typePersonal",
};

const addMonthsClamped = (base: Date, months: number) => {
  const day = base.getDate();
  const d = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return d;
};

const expandCustom = (list: CustomEventDef[]): CalendarEvent[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 7);
  const out: CalendarEvent[] = [];
  for (const ev of list) {
    const base = new Date(`${ev.date}T00:00:00`);
    if (isNaN(base.getTime())) continue;
    if (ev.repeat === "monthly") {
      for (let i = 0; i < 12; i++) {
        const start = addMonthsClamped(base, i);
        if (start >= cutoff) {
          out.push({ id: `${ev.id}-m${i}`, customId: ev.id, type: ev.type, start, end: new Date(start), name: ev.name, note: ev.note || "" });
        }
      }
    } else if (base >= cutoff) {
      out.push({ id: `${ev.id}-once`, customId: ev.id, type: ev.type, start: base, end: new Date(base), name: ev.name, note: ev.note || "" });
    }
  }
  return out;
};

export const daysUntil = (date: Date) => Math.ceil((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86_400_000);

const reminderLabel = (days: number, t: (key: string) => string): string | null => {
  switch (days) {
    case 30: return t("eventCalendar.reminder30");
    case 14: return t("eventCalendar.reminder14");
    case 7: return t("eventCalendar.reminder7");
    case 3: return t("eventCalendar.reminder3");
    case 1: return t("eventCalendar.reminder1");
    default: return null;
  }
};

export const EventCalendar = () => {
  const { t, i18n } = useTranslation();
  const { transactions } = useFinance();
  const { formatFromUSD } = useCurrency();
  const [region, setRegion] = useState<Region>(() => (localStorage.getItem(REGION_KEY) as Region) || "India");
  const [marginAdjusted, setMarginAdjusted] = useState(false);
  const [customEvents, setCustomEvents] = useState<CustomEventDef[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY) ?? "[]") as CustomEventDef[]; } catch { return []; }
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [evName, setEvName] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evType, setEvType] = useState("Income");
  const [evRepeat, setEvRepeat] = useState<"none" | "monthly">("monthly");
  const [evNote, setEvNote] = useState("");

  const switchRegion = (next: Region) => {
    setRegion(next);
    localStorage.setItem(REGION_KEY, next);
  };

  const events = useMemo(
    () => [...eventData(region), ...expandCustom(customEvents)].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [region, customEvents],
  );

  const displayNameOf = (event: CalendarEvent) => (event.nameKey ? t(event.nameKey) : event.name ?? "");
  const displayNoteOf = (event: CalendarEvent) => (event.noteKey ? t(event.noteKey) : event.note ?? "");
  const displayTypeOf = (event: CalendarEvent) => t(TYPE_KEYS[event.type] ?? event.type, { defaultValue: event.type });

  const activeEvent = events.find((event) => {
    const days = daysUntil(event.start);
    return days >= 0 && days <= 7;
  });

  const forecast = useMemo(() => {
    const expenses = transactions.filter((transaction) => transaction.type === "expense");
    const average = expenses.length ? expenses.reduce((sum, transaction) => sum + transaction.amount, 0) / expenses.length : 0;
    const upcoming = activeEvent;
    // #kintanjain
    if (!upcoming) return { usual: average, projected: average, increase: 0 };
    const eventWindowSpend = expenses.filter((transaction) => {
      const date = new Date(transaction.date);
      const monthDay = date.getMonth() * 31 + date.getDate();
      const startMonthDay = upcoming.start.getMonth() * 31 + upcoming.start.getDate();
      const endMonthDay = upcoming.end.getMonth() * 31 + upcoming.end.getDate();
      // #athenanair
      return monthDay >= startMonthDay - 7 && monthDay <= endMonthDay;
    });
    const historicalAverage = eventWindowSpend.length
      ? eventWindowSpend.reduce((sum, transaction) => sum + transaction.amount, 0) / eventWindowSpend.length
      : average;
    const projected = historicalAverage * (eventWindowSpend.length ? 1.16 : 1.12);
    return { usual: historicalAverage, projected, increase: Math.max(0, projected - historicalAverage) };
  }, [activeEvent, transactions]);

  const formatDate = (date: Date) => new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(date);

  const addCustomEvent = () => {
    if (!evName.trim() || !evDate) return;
    setCustomEvents((prev) => [
      { id: `custom-${Date.now()}`, name: evName.trim(), date: evDate, type: evType, note: evNote.trim(), repeat: evRepeat },
      ...prev,
    ]);
    setEvName("");
    setEvDate("");
    setEvNote("");
    setEditorOpen(false);
  };

  const removeCustomEvent = (id: string) => setCustomEvents((prev) => prev.filter((ev) => ev.id !== id));

  return (
    <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"> <CalendarDays className="h-5 w-5" /> </div>
          <div>
            <p className="font-semibold font-heading">{t("eventCalendar.title")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("eventCalendar.subtitle")}</p>
          </div>
        </div>
        <div className="flex rounded-full border border-border bg-secondary/40 p-1 text-xs">
          {(["India", "Russia"] as Region[]).map((option) => (
            <button key={option} type="button" onClick={() => switchRegion(option)} className={`rounded-full px-3 py-1.5 font-medium transition-colors ${region === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{option}</button>
          ))}
        </div>
      </div>
      {activeEvent && (
        <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("eventCalendar.comingSoon", { name: displayNameOf(activeEvent) })}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("eventCalendar.safetyMarginNote", { amount: formatFromUSD(forecast.increase, { maximumFractionDigits: 0 }) })}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("eventCalendar.projectedSpend", { amount: formatFromUSD(forecast.projected, { maximumFractionDigits: 0 }) })}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setMarginAdjusted((value) => !value)}>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> {marginAdjusted ? t("eventCalendar.marginProtected") : t("eventCalendar.applyMargin")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {events.map((event) => {
          const distance = daysUntil(event.start);
          const reminder = distance >= 0 ? reminderLabel(distance, t) : null;
          return (
            <div key={event.id} className="rounded-2xl border border-border/80 bg-secondary/20 px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-16 text-center"><p className="text-xs font-semibold">{formatDate(event.start)}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{displayTypeOf(event)}</p></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{displayNameOf(event)}</p><p className="truncate text-xs text-muted-foreground">{displayNoteOf(event)}</p></div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{distance === 0 ? t("eventCalendar.today") : `${distance}${t("eventCalendar.daysSuffix")}`}</span>
                {event.customId && (
                  <button type="button" className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive" onClick={() => removeCustomEvent(event.customId!)} aria-label={t("eventCalendar.deleteEvent")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              {reminder && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {reminder}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditorOpen((value) => !value)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {editorOpen ? t("eventCalendar.closeEditor") : t("eventCalendar.addPersonalEvent")}
        </Button>
        {editorOpen && (
          <div className="mt-3 space-y-2 rounded-2xl border border-border bg-secondary/20 p-3">
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("eventCalendar.editorNamePlaceholder")} value={evName} onChange={(e) => setEvName(e.target.value)} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input type="date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={evDate} onChange={(e) => setEvDate(e.target.value)} />
              <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={evType} onChange={(e) => setEvType(e.target.value)}>
                <option value="Income">{t("eventCalendar.typeIncome")}</option>
                <option value="Holiday">{t("eventCalendar.typeHoliday")}</option>
                <option value="Personal">{t("eventCalendar.typePersonal")}</option>
                <option value="Academic">{t("eventCalendar.typeAcademic")}</option>
              </select>
              <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={evRepeat} onChange={(e) => setEvRepeat(e.target.value as "none" | "monthly")}>
                <option value="monthly">{t("eventCalendar.repeatMonthly")}</option>
                <option value="none">{t("eventCalendar.repeatOnce")}</option>
              </select>
              <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("eventCalendar.editorNotePlaceholder")} value={evNote} onChange={(e) => setEvNote(e.target.value)} />
            </div>
            <Button type="button" size="sm" className="w-full" onClick={addCustomEvent} disabled={!evName.trim() || !evDate}>
              {t("eventCalendar.saveEvent")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("eventCalendar.editorHint")}</p>
          </div>
        )}
      </div>
    </section>
  );
};