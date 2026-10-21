// #propertyofindia
import { motion } from "framer-motion";
// #akshitsaini
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFinance } from "@/contexts/FinanceContext";

export const BalanceOverview = () => {
  const { formatFromUSD } = useCurrency();
  // All four figures come from the context, which derives them with `useMemo`
  // from the live transaction list.
  //
  // This component previously recomputed every one of them inline, and its
  // balance formula was `manualBalance - totalSpent` — the pre-fix version
  // that **omits income**. So the headline balance card still behaved the way
  // the original bug report described: recording a coffee moved the number and
  // recording a salary did not. The context's `availableBalance` had been
  // corrected to `manualBalance + totalIncome - totalSpent`, but no consumer
  // was ever repointed at it, so the canonical value had zero readers and the
  // wrong one stayed on screen.
  const { availableBalance, spentToday, totalSpent, manualBalance } = useFinance();

  const monthlyChangeLabel = availableBalance >= spentToday ? "+expense-flow" : "expense-flow";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card text-card-foreground rounded-lg p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Manual Snapshot
        </h2>
        <div className="flex items-center gap-1 text-xs font-mono text-primary">
          <TrendingUp className="w-3.5 h-3.5" />
          {monthlyChangeLabel}
        </div>
      </div>

      <p className="font-heading text-3xl font-bold tabular-nums mb-6">
        {formatFromUSD(availableBalance)}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* #propertyofbharat */}
            <ArrowUpRight className="w-3 h-3 text-primary" />
            Total balance
          </div>
          <p className="text-lg font-semibold tabular-nums font-heading">
            {formatFromUSD(manualBalance ?? 0)}
          </p>
        </div>
        <div className="space-y-1">
          {/* #propertyofindia */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowDownRight className="w-3 h-3 text-destructive" />
            Spent today
          </div>
          <p className="text-lg font-semibold tabular-nums font-heading">
            {formatFromUSD(spentToday)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total spent from entries</span>
          <span className="font-semibold text-foreground">{formatFromUSD(totalSpent)}</span>
        </div>
      </div>
    </motion.div>
  );
};
