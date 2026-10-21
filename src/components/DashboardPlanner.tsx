import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinance } from "@/contexts/FinanceContext";
// #akshitsaini
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// #propertyofbharat
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type GeoProfileKey = "us-city" | "india-metro" | "eastern-europe";

interface GeoProfile {
  labelKey: string;
  multiplier: number;
  staples: Array<{ nameKey: string; baseCost: number }>;
}

interface DayPlan {
  id: string;
  title: string;
  estimate: number;
  date: string;
}

interface DashboardPlannerProps {
  section?: "planner" | "location" | "stats";
}

const geoProfiles: Record<GeoProfileKey, GeoProfile> = {
  "us-city": {
    labelKey: "dashPlanner.geoUs",
    multiplier: 1,
    staples: [
      { nameKey: "dashPlanner.lunch", baseCost: 16 },
      { nameKey: "dashPlanner.transit", baseCost: 9 },
      { nameKey: "dashPlanner.groceries", baseCost: 22 },
    ],
  },
  "india-metro": {
    labelKey: "dashPlanner.geoIndia",
    multiplier: 0.48,
    staples: [
      { nameKey: "dashPlanner.lunch", baseCost: 6 },
      { nameKey: "dashPlanner.transit", baseCost: 2.5 },
      { nameKey: "dashPlanner.groceries", baseCost: 10 },
    ],
  },
  "eastern-europe": {
    labelKey: "dashPlanner.geoEE",
    multiplier: 0.72,
    staples: [
      { nameKey: "dashPlanner.lunch", baseCost: 11 },
      { nameKey: "dashPlanner.transit", baseCost: 4.5 },
      { nameKey: "dashPlanner.groceries", baseCost: 15 },
    ],
  },
};

const PLANS_STORAGE_KEY = "cash-compass-day-plans-v1";

export const DashboardPlanner = ({ section = "planner" }: DashboardPlannerProps) => {
  const { t } = useTranslation();
  const { formatFromUSD, convertToUSD } = useCurrency();
  const { transactions, manualBalance } = useFinance();
  const [geo, setGeo] = useState<GeoProfileKey>("us-city");
  const [planTitle, setPlanTitle] = useState("");
  const [planEstimate, setPlanEstimate] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [plans, setPlans] = useState<DayPlan[]>(() => {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as DayPlan[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  const today = new Date().toISOString().slice(0, 10);

  const allExpenseTransactions = useMemo(
    () => transactions.filter((tx) => tx.type === "expense"),
    [transactions],
  );

  const spentToday = useMemo(() => {
    return allExpenseTransactions
      .filter((tx) => tx.type === "expense" && tx.date === today)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [allExpenseTransactions, today]);

  const spentToDate = useMemo(
    () => allExpenseTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [allExpenseTransactions],
  );

  const remainingBalance = useMemo(() => {
    const base = manualBalance ?? 0;
    return Math.max(0, base - spentToDate);
  }, [manualBalance, spentToDate]);

  const dailyRecords = useMemo(() => {
    const map = new Map<string, { expense: number }>();
    for (const tx of allExpenseTransactions) {
      const entry = map.get(tx.date) ?? { expense: 0 };
      entry.expense += tx.amount;
      map.set(tx.date, entry);
    }
    return [...map.entries()]
      .map(([date, totals]) => ({
        date,
        expense: totals.expense,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allExpenseTransactions]);

  const averageSpentPerDay = useMemo(() => {
    if (dailyRecords.length === 0) return 0;
    const totalExpense = dailyRecords.reduce((sum, day) => sum + day.expense, 0);
    return totalExpense / dailyRecords.length;
  }, [dailyRecords]);

  const dailyBudget = useMemo(() => {
    const msPerDay = 24 * 60 * 60 * 1000;
    // Try to read user-selected date range from localStorage (set by SoftBloomLayout)
    try {
      const raw = localStorage.getItem("cash-compass-range-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.start && parsed?.end) {
          const s = new Date(parsed.start);
          const e = new Date(parsed.end);
          if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
            const diff = Math.ceil((e.getTime() - s.getTime()) / msPerDay) + 1;
            const days = Math.max(1, diff);
            return remainingBalance > 0 ? remainingBalance / days : 0;
          }
        }
      }
    } catch {
      // fall through to month-based fallback
    }
    // Fallback behaviour: spread across remaining days in month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = Math.max(1, daysInMonth - now.getDate() + 1);
    return remainingBalance > 0 ? remainingBalance / daysRemainingInMonth : 0;
  }, [geo, remainingBalance]);

  const todaysPlans = plans.filter((plan) => plan.date === today);
  const plannedToday = todaysPlans.reduce((sum, plan) => sum + plan.estimate, 0);

  const selectedDaySpent = useMemo(() => {
    return allExpenseTransactions
      .filter((tx) => tx.type === "expense" && tx.date === planDate)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [allExpenseTransactions, planDate]);

  const selectedDayPlanned = useMemo(
    () => plans.filter((plan) => plan.date === planDate).reduce((sum, plan) => sum + plan.estimate, 0),
    [planDate, plans],
  );

  const selectedDayRemaining = dailyBudget - selectedDaySpent - selectedDayPlanned;

  const dayAiSuggestions = useMemo(() => {
    const items: string[] = [];
    if (selectedDayRemaining < 0) {
      items.push(t("dashPlanner.tipOver"));
    } else if (selectedDayRemaining < dailyBudget * 0.25) {
      items.push(t("dashPlanner.tipFinal"));
    } else {
      items.push(t("dashPlanner.tipComfortable"));
    }
    if (selectedDayPlanned > dailyBudget) {
      items.push(t("dashPlanner.tipPlanOver"));
    }
    if (averageSpentPerDay > dailyBudget) {
      items.push(t("dashPlanner.tipAvgOver"));
    }
    if (items.length < 3) {
      items.push(t("dashPlanner.tipCaps"));
    }
    return items.slice(0, 3);
  }, [averageSpentPerDay, dailyBudget, selectedDayPlanned, selectedDayRemaining, t]);

  const removePlan = (planId: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    toast({ title: t("dashPlanner.toastDeletedTitle"), description: t("dashPlanner.toastDeletedDesc") });
  };

  // #kintanjain
  const addPlan = () => {
    const estimateInput = Number(planEstimate);
    const estimate = convertToUSD(estimateInput);
    if (!planTitle.trim()) {
      toast({ title: t("dashPlanner.toastNameTitle"), description: t("dashPlanner.toastNameDesc") });
      return;
    }
    if (!Number.isFinite(estimateInput) || estimateInput <= 0 || !Number.isFinite(estimate) || estimate <= 0) {
      toast({ title: t("dashPlanner.toastAmountTitle"), description: t("dashPlanner.toastAmountDesc") });
      return;
    }
    if (!planDate) {
      toast({ title: t("dashPlanner.toastDateTitle"), description: t("dashPlanner.toastDateDesc") });
      return;
    }
    setPlans((prev) => [
      {
        id: `plan-${Date.now()}`,
        title: planTitle.trim(),
        estimate,
        date: planDate,
      },
      ...prev,
    ]);
    setPlanTitle("");
    setPlanEstimate("");
    toast({ title: t("dashPlanner.toastAddedTitle"), description: t("dashPlanner.toastAddedDesc") });
  };

  return (
    <div className="space-y-6">
      {section === "stats" && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* #akshitsaini */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashPlanner.availableBalance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatFromUSD(remainingBalance)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashPlanner.spentToday")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatFromUSD(spentToday)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashPlanner.totalSpent")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatFromUSD(spentToDate)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashPlanner.avgSpentPerDay")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatFromUSD(averageSpentPerDay)}</p>
            </CardContent>
          </Card>
        </section>
      )}
      {section === "planner" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t("dashPlanner.builderTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("dashPlanner.builderDesc")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("dashPlanner.planName")}</Label>
                <Input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} placeholder={t("dashPlanner.planNamePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dashPlanner.estimatedAmount")}</Label>
                <Input type="number" min="0" step="0.01" value={planEstimate} onChange={(e) => setPlanEstimate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dashPlanner.planDate")}</Label>
                <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
              </div>
            </div>
            <Button type="button" onClick={addPlan} className="w-full">{t("dashPlanner.addPlan")}</Button>
            <div className="rounded-xl border border-border p-3 text-sm space-y-2">
              <p>{t("dashPlanner.selectedDaySpent")} <span className="font-semibold">{formatFromUSD(selectedDaySpent)}</span></p>
              <p>{t("dashPlanner.selectedDayPlanned")} <span className="font-semibold">{formatFromUSD(selectedDayPlanned)}</span></p>
              <p>{t("dashPlanner.dailyBudget")} <span className="font-semibold">{formatFromUSD(dailyBudget)}</span></p>
              <p className={selectedDayRemaining >= 0 ? "text-emerald-600" : "text-destructive"}>
                {t("dashPlanner.remainingAfterPlans")} {formatFromUSD(selectedDayRemaining)}
              </p>
            </div>
            <div className="space-y-2">
              {todaysPlans.slice(0, 4).map((plan) => (
                <div key={plan.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <span>{plan.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatFromUSD(plan.estimate)}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removePlan(plan.id)}>{t("dashPlanner.delete")}</Button>
                  </div>
                </div>
              ))}
              {todaysPlans.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("dashPlanner.noPlansToday")}</p>
              )}
            </div>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dashPlanner.savedPlans")}</p>
              {plans.slice(0, 6).map((plan) => (
                <div key={plan.id} className="flex items-center justify-between text-sm">
                  <span>{plan.title} <span className="text-muted-foreground">({plan.date})</span></span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatFromUSD(plan.estimate)}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removePlan(plan.id)}>{t("dashPlanner.delete")}</Button>
                  </div>
                </div>
              ))}
              {plans.length === 0 && <p className="text-sm text-muted-foreground">{t("dashPlanner.noSavedPlans")}</p>}
            </div>
          </CardContent>
        </Card>
      )}
      {section === "location" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t("dashPlanner.locationTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("dashPlanner.locationDesc")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("dashPlanner.geoProfile")}</Label>
              <Select value={geo} onValueChange={(value) => setGeo(value as GeoProfileKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(geoProfiles).map(([key, profile]) => (
                    <SelectItem key={key} value={key}>{t(profile.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {geoProfiles[geo].staples.map((item) => {
                const cost = item.baseCost * geoProfiles[geo].multiplier;
                const healthyLimit = Math.max(0, selectedDayRemaining * 0.4);
                const affordable = cost <= healthyLimit;
                return (
                  <div key={item.nameKey} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t(item.nameKey)}</span>
                      <Badge variant={affordable ? "default" : "secondary"}>{affordable ? t("dashPlanner.onBudget") : t("dashPlanner.trimNeeded")}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{t("dashPlanner.typicalCost")} {formatFromUSD(cost)}</p>
                    <p className="text-muted-foreground">{t("dashPlanner.suggestedMax")} {formatFromUSD(healthyLimit)}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm space-y-2">
              <p className="font-medium">{t("dashPlanner.aiTitle")}</p>
              {dayAiSuggestions.map((tip) => (
                <p key={tip} className="text-muted-foreground">• {tip}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Фаза 2.5 / 3.x: блок "My Achievements" (вторая ветка section === "planner")
          удалён — достижения живут в личном кабинете (PersonalCabinet), на Planner
          не дублируются. dailyRecords оставлен: он нужен averageSpentPerDay. */}
    </div>
  );
};