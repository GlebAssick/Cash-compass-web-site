import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronDown, CreditCard, TrendingDown, Wallet } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { detectSubscriptions } from "@/lib/subscriptions";
import { budgetUsage } from "@/lib/budgets";
import { eventData, daysUntil } from "@/components/widgets/EventCalendar";

/**
  Live notification feed for the sidebar. Replaces the old static
  "Next bill 2d / Unread 3" stub: every line here is computed from real
  data — today's spend, the nearest calendar event (with a "start saving"
  nudge inside the 7-day window), detected recurring charges renewing
  within a week, and over-limit category budgets. The header is a button:
  it toggles the full list; the first line stays visible as a preview.
*/
interface Note {
  id: string;
  icon: React.ReactNode;
  text: string;
}

const MS_PER_DAY = 86_400_000;

export const NotificationCenter = () => {
  const { t } = useTranslation();
  const { transactions, budgets } = useFinance();
  const { formatFromUSD } = useCurrency();
  const [open, setOpen] = useState(false);
  const region = (localStorage.getItem("cash-compass-region") as "India" | "Russia") || "India";

  const notes = useMemo<Note[]>(() => {
    const out: Note[] = [];

    const today = new Date().toISOString().slice(0, 10);
    const spentToday = transactions
      .filter((tx) => tx.type === "expense" && tx.date === today)
      .reduce((sum, tx) => sum + tx.amount, 0);
    out.push({
      id: "spend",
      icon: <Wallet className="h-3.5 w-3.5 shrink-0 text-primary" />,
      text: spentToday > 0
        ? t("notifications.spentToday", { amount: formatFromUSD(spentToday) })
        : t("notifications.noSpend"),
    });

    const nearest = eventData(region)
      .map((ev) => ({ ev, days: daysUntil(ev.start) }))
      .filter((x) => x.days >= 0 && x.days <= 30)
      .sort((a, b) => a.days - b.days)[0];
    if (nearest) {
      const name = nearest.ev.nameKey ? t(nearest.ev.nameKey) : (nearest.ev.name ?? "");
      out.push({
        id: "event",
        icon: <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary" />,
        text: nearest.days === 0
          ? t("notifications.eventToday", { name })
          : `${t("notifications.eventSoon", { name, days: nearest.days })}${nearest.days <= 7 ? ` ${t("notifications.eventSave")}` : ""}`,
      });
    }

    const todayMs = new Date();
    todayMs.setHours(0, 0, 0, 0);
    const bill = detectSubscriptions(transactions)
      .map((sub) => {
        const last = new Date(sub.lastCharged);
        const next = new Date(last.getTime() + sub.averageIntervalDays * MS_PER_DAY);
        return { sub, days: Math.round((next.getTime() - todayMs.getTime()) / MS_PER_DAY) };
      })
      .filter((x) => x.days <= 7)
      .sort((a, b) => a.days - b.days)[0];
    if (bill) {
      out.push({
        id: "bill",
        icon: <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />,
        text: bill.days <= 0
          ? t("notifications.billDue", { name: bill.sub.name })
          : t("notifications.billSoon", { name: bill.sub.name, days: bill.days }),
      });
    }

    const over = budgetUsage(budgets, transactions).find((u) => u.ratio > 1);
    if (over) {
      out.push({
        id: "budget",
        icon: <TrendingDown className="h-3.5 w-3.5 shrink-0 text-primary" />,
        text: t("notifications.budgetOver", { name: over.name, pct: Math.round(over.ratio * 100) }),
      });
    }

    return out;
  }, [transactions, budgets, region, t, formatFromUSD]);

  const [first, ...rest] = notes;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("notifications.title")}
        </p>
        <span className="flex items-center gap-1">
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">{notes.length}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        {first ? (<>{first.icon}<span>{first.text}</span></>) : t("notifications.empty")}
      </p>
      {open && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {rest.map((n) => (
            <p key={n.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              {n.icon}<span>{n.text}</span>
            </p>
          ))}
          {rest.length === 0 && <p className="text-xs text-muted-foreground">{t("notifications.emptyMore")}</p>}
        </div>
      )}
    </div>
  );
};