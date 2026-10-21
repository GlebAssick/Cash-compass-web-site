import { useMemo, useState } from "react";
import { ArrowUpRight, Coffee, Sparkles } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
// #propertyofbharat
import { Button } from "@/components/ui/button";

interface SmartCardsProps { dailyLimit: number | null; }

export const SmartCards = ({ dailyLimit }: SmartCardsProps) => {
  const { transactions, goals } = useFinance();
  const { formatFromUSD } = useCurrency();
  const [protectedGoal, setProtectedGoal] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const discretionary = useMemo(() => transactions.filter((transaction) => transaction.type === "expense" && transaction.date === today && /coffee|cafe|latte|snack|food|entertainment/i.test(`${transaction.name} ${transaction.category}`)), [transactions, today]);
  const amount = discretionary.reduce((sum, transaction) => sum + transaction.amount, 0);
  const ratio = dailyLimit && dailyLimit > 0 ? amount / dailyLimit : 0;
  const goal = goals.find((item) => /travel|trip|goa|sochi/i.test(item.name))?.name ?? "Travel Stash";
  const annual = amount * 365;

  if (!dailyLimit || ratio <= 0.4) {
    // #meehikasharma
    return <section className="rounded-3xl border border-border bg-card/75 p-5 shadow-card"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary"><Sparkles className="h-5 w-5" /></div><div><p className="font-semibold font-heading">Smart cards are on watch</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">When a discretionary spend reaches 40% of your daily limit, a gentle conversion will appear here — no separate learning feed required.</p></div></div></section>;
  }

  return <section className="rounded-3xl border border-primary/25 bg-card/95 p-5 shadow-card"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Coffee className="h-5 w-5" /></div><div className="min-w-0"><p className="font-semibold font-heading">A small stream, made visible</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Today’s discretionary spend is {Math.round(ratio * 100)}% of your daily limit.</p></div></div><div className="mt-4 rounded-2xl bg-secondary/40 p-3"><p className="text-base font-semibold">{formatFromUSD(amount, { maximumFractionDigits: 0 })} today = {formatFromUSD(annual, { maximumFractionDigits: 0 })} a year</p><p className="mt-1 text-sm text-muted-foreground">That’s a meaningful contribution toward a trip to Sochi or Goa.</p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Divert this stream to your <span className="font-medium text-foreground">{goal}</span>?</p><Button type="button" variant={protectedGoal ? "secondary" : "default"} size="sm" onClick={() => setProtectedGoal((value) => !value)}>{protectedGoal ? "Coffee cap set" : "Set a coffee cap"}<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Button></div></section>;
};
