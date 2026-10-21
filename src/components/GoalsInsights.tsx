import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinance } from "@/contexts/FinanceContext";
import { goalPercent } from "@/lib/goals";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinancialCharts } from "@/components/FinancialCharts";
import { PersonalizedTipsCard } from "@/components/PersonalizedTipsCard";
import { Trash2 } from "lucide-react";

const BUDGET_PLANS_KEY = "cash-compass-budget-plans-v1";

interface FinalizedBudgetPlan {
  id: string;
  title: string;
  planType: string;
  dateFrom: string;
  dateTo?: string;
  people: number;
  items: Array<{ id: string; name: string; estimate: number }>;
  total: number;
  perPerson: number;
  createdAt: string;
  settledWith?: string[];
}

export const GoalsInsights = () => {
  const { goals, contributeToGoal } = useFinance();
  const { formatFromUSD, convertFromUSD } = useCurrency();
  const { t } = useTranslation();

  const [budgetPlans, setBudgetPlans] = useState<FinalizedBudgetPlan[]>(() => {
    const raw = localStorage.getItem(BUDGET_PLANS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as FinalizedBudgetPlan[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const removeBudgetPlan = (planId: string) => {
    const next = budgetPlans.filter((p) => p.id !== planId);
    setBudgetPlans(next);
    localStorage.setItem(BUDGET_PLANS_KEY, JSON.stringify(next));
  };

  const contributionUSD = (() => {
    return 100 / (convertFromUSD(1) || 1);
  })();

  const planTypeLabels: Record<string, string> = {
    trip: t("goalsPage.planTypes.trip"),
    outing: t("goalsPage.planTypes.outing"),
    event: t("goalsPage.planTypes.event"),
  };

  return (
    <div className="space-y-6">
      {goals.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t("goalsPage.savingsGoals")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("goalsPage.savingsGoalsSubtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {goals.map((goal) => {
              const pct = goalPercent(goal);
              const isComplete = goal.current >= goal.target;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{goal.icon}</span>
                      <span className="text-sm font-medium">{goal.name}</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatFromUSD(goal.current, { maximumFractionDigits: 0 })} / {formatFromUSD(goal.target, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {pct}%{isComplete && ` ✓ ${t("goalsPage.complete")}`}
                    </p>
                    {!isComplete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => contributeToGoal(goal.id, contributionUSD)}
                      >
                        +100
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {budgetPlans.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t("goalsPage.budgetReceipts")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("goalsPage.budgetReceiptsSubtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{plan.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {planTypeLabels[plan.planType] ?? plan.planType}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBudgetPlan(plan.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan.dateFrom}{plan.dateTo ? ` → ${plan.dateTo}` : ""}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("goalsPage.total")}</span>
                  <span className="font-semibold">{formatFromUSD(plan.total)}</span>
                </div>
                {plan.people > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("goalsPage.perPerson", { count: plan.people })}</span>
                    <span className="font-medium">{formatFromUSD(plan.perPerson)}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("goalsPage.spendingTrend")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("goalsPage.spendingTrendSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <FinancialCharts />
        </CardContent>
      </Card>

      <PersonalizedTipsCard />
    </div>
  );
};