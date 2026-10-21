import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PersonalizedTipsCard = () => {
  const { transactions } = useFinance();
  const { formatFromUSD } = useCurrency();
  const { t } = useTranslation();

  const summary = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount);
    }
    const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const biggest = sorted[0];
    const second = sorted[1];
    const totalExpense = sorted.reduce((sum, [, amount]) => sum + amount, 0);
    return { biggest, second, totalExpense };
  }, [transactions]);

  const personalizedTips = useMemo(() => {
    const tips: string[] = [];

    if (summary.biggest) {
      tips.push(t("tips.biggestCategory", { category: summary.biggest[0], amount: formatFromUSD(summary.biggest[1]) }));
    }

    if (summary.second && summary.biggest) {
      const combined = summary.biggest[1] + summary.second[1];
      const ratio = summary.totalExpense > 0 ? (combined / summary.totalExpense) * 100 : 0;
      tips.push(t("tips.topTwo", { percent: ratio.toFixed(0) }));
    }

    tips.push(t("tips.essentialsFlex"));
    tips.push(t("tips.lowerNextTwo"));

    return tips.slice(0, 4);
  }, [t, formatFromUSD, summary.biggest, summary.second, summary.totalExpense]);

return(
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t("tips.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("tips.subtitle")}</p>
        </CardHeader>
      <CardContent className="space-y-3">
        {personalizedTips.map((tip) => (
          <div key={tip} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
            {tip}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};