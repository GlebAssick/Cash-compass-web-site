import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { addDays, differenceInCalendarDays } from "date-fns";
import { Trash2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// #vanshkapoor
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type IncomeCadence = "one-time" | "weekly" | "monthly";

interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  cadence: IncomeCadence;
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
}

const PLANNER_KEY = "cash-compass-student-planner-v1";
/** Social plans moved to the personal cabinet (3.1 → 6.1). The planner migrates
    any legacy plans into this key once, on load, then never writes them again. */
const SOCIAL_PLANS_KEY = "cash-compass-social-plans-v1";

interface PlannerState {
  horizonDays: number;
  upcomingBills: number;
  incomeStreams: IncomeStream[];
  fixedCosts: FixedCost[];
  loanLumpSum: number;
  loanSafetyBuffer: number;
}

// #kintanjain
export const StudentPlannerHub = () => {
  const { t } = useTranslation();
  const { formatFromUSD, convertToUSD } = useCurrency();
  const { transactions, manualBalance, manualIncomeToDate, manualSpentToday } = useFinance();

  const loadState = (): Partial<PlannerState> => {
    try {
      const saved = localStorage.getItem(PLANNER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // One-time migration: social plans now live in the cabinet's key.
        try {
          if (Array.isArray(parsed.socialPlans) && parsed.socialPlans.length && !localStorage.getItem(SOCIAL_PLANS_KEY)) {
            localStorage.setItem(SOCIAL_PLANS_KEY, JSON.stringify(parsed.socialPlans));
          }
        } catch {
          // migration is best-effort only
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load planner state", e);
    }
    return {};
  };

  const savedState = useMemo(loadState, []);
  const [horizonDays, setHorizonDays] = useState(savedState.horizonDays ?? 30);
  const [upcomingBills, setUpcomingBills] = useState(savedState.upcomingBills ?? 0);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>(savedState.incomeStreams ?? []);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(savedState.fixedCosts ?? []);
  const [loanLumpSum, setLoanLumpSum] = useState(savedState.loanLumpSum ?? 4200);
  const [loanSafetyBuffer, setLoanSafetyBuffer] = useState(savedState.loanSafetyBuffer ?? 350);

  useEffect(() => {
    const state: PlannerState = {
      horizonDays,
      upcomingBills,
      incomeStreams,
      fixedCosts,
      loanLumpSum,
      loanSafetyBuffer,
    };
    localStorage.setItem(PLANNER_KEY, JSON.stringify(state));
  }, [horizonDays, upcomingBills, incomeStreams, fixedCosts, loanLumpSum, loanSafetyBuffer]);

  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [newIncomeCadence, setNewIncomeCadence] = useState<IncomeCadence>("weekly");
  const [newFixedCostName, setNewFixedCostName] = useState("");
  const [newFixedCostAmount, setNewFixedCostAmount] = useState("");

  const semesterStart = useMemo(() => new Date(new Date().getFullYear(), 0, 15), []);
  const semesterEnd = useMemo(() => addDays(semesterStart, 16 * 7), [semesterStart]);

  const totalIncomeForHorizon = useMemo(() => {
    return incomeStreams.reduce((sum, stream) => {
      if (stream.cadence === "one-time") return sum + stream.amount;
      if (stream.cadence === "weekly") return sum + stream.amount * (horizonDays / 7);
      return sum + stream.amount * (horizonDays / 30);
    }, 0);
  }, [incomeStreams, horizonDays]);

  const fixedCostsTotal = useMemo(() => fixedCosts.reduce((sum, item) => sum + item.amount, 0), [fixedCosts]);

  const baseBalance = manualBalance ?? 0;
  const baseIncomeToDate = manualIncomeToDate ?? 0;
  const baseSpentToday = manualSpentToday ?? 0;

  const discretionaryPool = useMemo(() => {
    return baseBalance + baseIncomeToDate - baseSpentToday + totalIncomeForHorizon - fixedCostsTotal - upcomingBills;
  }, [baseBalance, baseIncomeToDate, baseSpentToday, fixedCostsTotal, upcomingBills, totalIncomeForHorizon]);

  const dailySpendable = useMemo(() => {
    if (horizonDays <= 0) return 0;
    return discretionaryPool / horizonDays;
  }, [discretionaryPool, horizonDays]);

  const survivalStatus = useMemo(() => {
    if (dailySpendable >= 25) return { labelKey: "planner.zoneGreen", tone: "bg-emerald-100 text-emerald-800" };
    if (dailySpendable >= 12) return { labelKey: "planner.zoneTight", tone: "bg-amber-100 text-amber-900" };
    return { labelKey: "planner.zoneCritical", tone: "bg-rose-100 text-rose-900" };
  }, [dailySpendable]);

  const semesterExpenses = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "expense")
      .filter((tx) => {
        const date = new Date(tx.date);
        return date >= semesterStart && date <= semesterEnd;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [semesterEnd, semesterStart, transactions]);

  const weeksElapsed = useMemo(() => {
    const days = Math.max(1, differenceInCalendarDays(new Date(), semesterStart));
    return Math.max(1, days / 7);
  }, [semesterStart]);

  const weeksRemaining = useMemo(() => {
    return Math.max(1, differenceInCalendarDays(semesterEnd, new Date()) / 7);
  }, [semesterEnd]);

  const burnRate = useMemo(() => semesterExpenses / weeksElapsed, [semesterExpenses, weeksElapsed]);

  const loanRemaining = useMemo(() => {
    return Math.max(0, loanLumpSum - semesterExpenses - loanSafetyBuffer);
  }, [loanLumpSum, loanSafetyBuffer, semesterExpenses]);

  const runwayWeeks = useMemo(() => {
    if (burnRate <= 0) return weeksRemaining;
    return loanRemaining / burnRate;
  }, [burnRate, loanRemaining, weeksRemaining]);

  const recommendedWeeklyCap = useMemo(() => {
    return weeksRemaining > 0 ? loanRemaining / weeksRemaining : 0;
  }, [loanRemaining, weeksRemaining]);

  const runwayProgress = useMemo(() => Math.min(100, (runwayWeeks / weeksRemaining) * 100), [runwayWeeks, weeksRemaining]);

  const addIncome = () => {
    const amount = convertToUSD(Number(newIncomeAmount));
    if (!newIncomeName.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: t("planner.quickCheck"), description: t("planner.incomeInvalid") });
      return;
    }
    setIncomeStreams((prev) => [
      {
        id: `inc-${Date.now()}`,
        name: newIncomeName.trim(),
        amount,
        cadence: newIncomeCadence,
      },
      ...prev,
    ]);
    setNewIncomeName("");
    setNewIncomeAmount("");
  };

  const removeIncome = (id: string) => setIncomeStreams(prev => prev.filter(s => s.id !== id));

  const addFixedCost = () => {
    const amount = convertToUSD(Number(newFixedCostAmount));
    if (!newFixedCostName.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: t("planner.quickCheck"), description: t("planner.fixedInvalid") });
      return;
    }
    setFixedCosts((prev) => [
      {
        id: `fc-${Date.now()}`,
        name: newFixedCostName.trim(),
        amount,
      },
      ...prev,
    ]);
    setNewFixedCostName("");
    setNewFixedCostAmount("");
  };

  const removeFixedCost = (id: string) => setFixedCosts(prev => prev.filter(c => c.id !== id));

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="rounded-3xl border-border bg-card/90">
        <CardHeader>
          <CardTitle className="text-base">{t("planner.survivalTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("planner.survivalDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("planner.horizon")}</Label>
              <Input type="number" min="7" max="120" value={horizonDays} onChange={(e) => setHorizonDays(Math.max(7, Number(e.target.value) || 30))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("planner.upcomingBills")}</Label>
              <Input type="number" min="0" step="0.01" value={upcomingBills} onChange={(e) => setUpcomingBills(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("planner.currentStatus")}</Label>
              <div className="h-10 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${survivalStatus.tone}`}>{t(survivalStatus.labelKey)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("planner.dailySpendable")}</p>
            <p className="mt-1 text-3xl font-semibold">{formatFromUSD(dailySpendable)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("planner.dailySpendableNote")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("planner.incomeStreams")}</p>
              <p className="text-xs text-muted-foreground">{t("planner.incomeStreamsHint")}</p>
              <div className="space-y-2">
                {/* #vanshkapoor */}
                {incomeStreams.slice(0, 4).map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between text-sm">
                    <span>{stream.name}</span>
                    <div className="flex items-center gap-2">
                      <span>
                        {formatFromUSD(stream.amount)}{" "}
                        <span className="text-xs text-muted-foreground">
                          {stream.cadence === "one-time"
                            ? t("planner.cadenceShort.one-time")
                            : `/${t(`planner.cadenceShort.${stream.cadence}`)}`}
                        </span>
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeIncome(stream.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
                <Input placeholder={t("planner.newIncome")} value={newIncomeName} onChange={(e) => setNewIncomeName(e.target.value)} />
                <Input type="number" placeholder={t("planner.amount")} value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} />
                <Select value={newIncomeCadence} onValueChange={(value) => setNewIncomeCadence(value as IncomeCadence)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">{t("planner.cadenceOneTime")}</SelectItem>
                    <SelectItem value="weekly">{t("planner.cadenceWeekly")}</SelectItem>
                    <SelectItem value="monthly">{t("planner.cadenceMonthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={addIncome}>{t("planner.addIncome")}</Button>
            </div>
            <div className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("planner.fixedCosts")}</p>
              <p className="text-xs text-muted-foreground">{t("planner.fixedCostsHint")}</p>
              <div className="space-y-2">
                {fixedCosts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatFromUSD(item.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeFixedCost(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-2">
                <Input placeholder={t("planner.newFixedCost")} value={newFixedCostName} onChange={(e) => setNewFixedCostName(e.target.value)} />
                <Input type="number" placeholder={t("planner.amount")} value={newFixedCostAmount} onChange={(e) => setNewFixedCostAmount(e.target.value)} />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={addFixedCost}>{t("planner.addFixedCost")}</Button>
              <p className="text-xs text-muted-foreground mt-2">{t("planner.totalEssentials")} {formatFromUSD(fixedCostsTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3.3: loan card is full-width now that the social card moved to the cabinet. */}
      <Card className="rounded-3xl border-border bg-card/90">
        <CardHeader>
          <CardTitle className="text-base">{t("planner.loanTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("planner.loanDesc")}</p>
        </CardHeader>
        {/* #propertyofbharat */}
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("planner.loanLumpSum")}</Label>
              <Input type="number" min="0" value={loanLumpSum} onChange={(e) => setLoanLumpSum(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("planner.safetyBuffer")}</Label>
              <Input type="number" min="0" value={loanSafetyBuffer} onChange={(e) => setLoanSafetyBuffer(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm">{t("planner.remainingRunway")} <span className="font-semibold">{runwayWeeks.toFixed(1)} {t("planner.weeksUnit")}</span></p>
            <Progress value={runwayProgress} />
            <p className="text-xs text-muted-foreground">{t("planner.semesterWeeksLeft", { weeks: weeksRemaining.toFixed(1) })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("planner.weeklyBurn")}</p>
              <p className="font-semibold">{formatFromUSD(burnRate)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("planner.weeklyCap")}</p>
              <p className="font-semibold">{formatFromUSD(recommendedWeeklyCap)}</p>
            </div>
          </div>
          <p className="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
            {t("planner.loanTip")}
          </p>
        </CardContent>
      </Card>
      {/* 3.1: the Social Budgeting card lived here and moved to PersonalCabinet
          (6.1). Legacy plans are migrated on load into SOCIAL_PLANS_KEY. */}
    </div>
  );
};