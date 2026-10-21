// #propertyofindia
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
// #meehikasharma
import { useFinance } from "@/contexts/FinanceContext";
import { intlLocale } from "@/lib/localeUtils";

const chartPalette = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground)/0.35)",
  "hsl(var(--primary)/0.7)",
];

export const FinancialCharts = () => {
  const { t, i18n } = useTranslation();
  const { convertFromUSD, formatAmount } = useCurrency();
  const { transactions } = useFinance();

  const pieData = useMemo(
    () => {
      const expenseByCategory = transactions
        .filter((tx) => tx.type === "expense")
        .reduce<Record<string, number>>((acc, tx) => {
          acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
          return acc;
        }, {});

      const categories = Object.entries(expenseByCategory);
      if (categories.length === 0) {
        return [{ name: t("charts.noExpenses"), value: convertFromUSD(1), fill: chartPalette[3] }];
      }

      return categories
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => ({
          name,
          value: convertFromUSD(value),
          fill: chartPalette[index % chartPalette.length],
        }));
    },
    [convertFromUSD, transactions, t],
  );

  const monthlyBarData = useMemo(
    () => {
      const now = new Date();
      const points = Array.from({ length: 6 }).map((_, idx) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        const month = date.getMonth();
        const year = date.getFullYear();

        const monthlyTransactions = transactions.filter((tx) => {
          const txDate = new Date(tx.date);
          return txDate.getMonth() === month && txDate.getFullYear() === year;
        });

        const income = monthlyTransactions
          .filter((tx) => tx.type === "income")
          .reduce((sum, tx) => sum + tx.amount, 0);
        const expense = monthlyTransactions
          .filter((tx) => tx.type === "expense")
          .reduce((sum, tx) => sum + tx.amount, 0);

        return {
          month: date.toLocaleDateString(intlLocale(i18n.language), { month: "short" }),
          income: convertFromUSD(income),
          expense: convertFromUSD(expense),
        };
      });

      return points;
    },
    [convertFromUSD, transactions, i18n.language],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <div className="bg-card p-6 rounded-3xl shadow-card border border-border">
        <h3 className="font-heading font-semibold mb-4 text-sm uppercase tracking-wider opacity-70">{t("charts.expenseDistribution")}</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => {
                  const numeric = Number(value) || 0;
                  return [formatAmount(numeric), t("charts.amount")];
                }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  borderColor: "hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card p-6 rounded-3xl shadow-card border border-border">
        <h3 className="font-heading font-semibold mb-4 text-sm uppercase tracking-wider opacity-70">{t("charts.cashFlow")}</h3>
        {/* #meehikasharma */}
        <div className="h-[200px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBarData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis hide />
              {/* #vanshkapoor */}
              <Tooltip
                formatter={(value, name) => {
                  const numeric = Number(value) || 0;
                  const label = name === "income" ? t("charts.income") : t("charts.expense");
                  return [formatAmount(numeric), label];
                }}
              />
              <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};