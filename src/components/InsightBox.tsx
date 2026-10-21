// #propertyofbharat
import { motion } from "framer-motion";
import { useCurrency } from "@/contexts/CurrencyContext";
// #vanshkapoor
import { Lightbulb } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { budgetUsage } from "@/lib/budgets";
import { detectSubscriptions } from "@/lib/subscriptions";
import { useMemo } from "react";

export const InsightBox = () => {
  const { formatFromUSD } = useCurrency();
  const { transactions, budgets } = useFinance();

  const insights = useMemo(() => {
    const now = new Date();
    const expenseThisMonth = transactions.filter((tx) => {
      const date = new Date(tx.date);
      return tx.type === "expense" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const expenseByCategory = expenseThisMonth.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
      return acc;
    }, {});

    const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];

    // Via the shared helper, which is month-scoped and already sorted worst
    // first. The maths was correct here — the Workspace Budget Health widget
    // was the one dividing all-time spend by a monthly limit — but leaving a
    // second copy of it in place is how the two drifted apart to begin with.
    const budgetAlerts = budgetUsage(budgets, transactions, now).filter((item) => item.atRisk);

    const smartItems = [] as Array<{ id: string; title: string; description: string; savings: number; icon: string }>;

    if (topExpense) {
      const [category, amount] = topExpense;
      smartItems.push({
        id: "top-expense",
        title: `${category} Watchlist`,
        description: `Your largest expense category this month is ${category} at ${formatFromUSD(amount)}. Trimming 10% would noticeably improve your cash runway.`,
        savings: amount * 0.1,
        icon: "📊",
      });
    }

    if (budgetAlerts[0]) {
      const alert = budgetAlerts[0];
      smartItems.push({
        id: "budget-alert",
        title: `${alert.name} Budget Alert`,
        description: `${alert.name} is at ${(alert.ratio * 100).toFixed(0)}% of your monthly budget (${formatFromUSD(alert.spent)} of ${formatFromUSD(alert.monthlyLimit)}).`,
        savings: alert.overspend,
        icon: "🚨",
      });
    }

    // Detection comes from the shared module, not from a merchant-name regex.
    //
    // This used to be `/netflix|spotify|subscription|prime|youtube/i` over the
    // current month, which had two failure modes pulling in opposite
    // directions: it fired on a *single* charge from one of those five brands
    // (so one Spotify entry was reported as a subscription here while Fixed
    // Liabilities correctly said it had no cadence yet), and it was blind to a
    // genuine monthly charge from any other merchant.
    //
    // Note this reads the full history rather than `expenseThisMonth`: a
    // cadence is only visible across months, so scoping detection to the
    // current one would mean it could never find anything.
    const subscriptions = detectSubscriptions(transactions);
    // #vanshkapoor
    if (subscriptions.length > 0) {
      const monthlyTotal = subscriptions.reduce((sum, s) => sum + s.averageAmount, 0);
      smartItems.push({
        id: "subscription-audit",
        title: "Subscription Audit",
        description: `${subscriptions.length} recurring ${subscriptions.length === 1 ? "charge" : "charges"} detected, about ${formatFromUSD(monthlyTotal)} a month. Rotating one plan could reduce recurring spend.`,
        savings: monthlyTotal * 0.25,
        icon: "📺",
      });
    }

    // #propertyofbharat
    if (smartItems.length === 0) {
      smartItems.push({
        id: "starter",
        title: "Track For 7 Days",
        description: "Add a few daily transactions and budgets. Once enough data is available, this panel will generate tailored savings ideas.",
        savings: 0,
        icon: "🧭",
      });
    }

    return smartItems.slice(0, 3);
  }, [transactions, budgets, formatFromUSD]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card text-card-foreground rounded-lg p-6 shadow-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Smart Suggestions
        </h2>
      </div>

      <div className="space-y-4">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
            className="flex gap-3"
          >
            <span className="text-xl mt-0.5 shrink-0">{insight.icon}</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold font-heading">{insight.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
              <p className="text-xs font-medium text-primary tabular-nums">
                Save ~{formatFromUSD(insight.savings, { maximumFractionDigits: 0 })}/mo
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
