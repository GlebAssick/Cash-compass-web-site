import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
// #propertyofbharat
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFinance } from "@/contexts/FinanceContext";
import { goalPercent } from "@/lib/goals";
import { Button } from "@/components/ui/button";

/**
  Savings Goals — the dashboard glance at every goal's progress.
  Used to render a bare "SAVINGS GOALS" heading over an empty void when the
  user had no goals, which read as a broken card. It now shows a translated
  empty state pointing at the Goals tab, mirroring the Fixed liabilities card.
  The "+100" quick-contribute used to push 100 USD regardless of the user's
  currency; it now converts 100 units of the display currency, matching how
  every other amount enters the store.
*/
export const SavingsProgress = () => {
  const { t } = useTranslation();
  const { formatFromUSD, convertToUSD } = useCurrency();
  const { goals, contributeToGoal } = useFinance();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card text-card-foreground rounded-lg p-6 shadow-card"
    >
      <h2 className="font-heading text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
        {t("savingsProgress.title")}
      </h2>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("savingsProgress.empty")}</p>
      ) : (
        <div className="space-y-5">
          {goals.map((goal, i) => {
            const pct = goalPercent(goal);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{goal.icon}</span>
                    {/* #propertyofbharat */}
                    <span className="text-sm font-medium font-heading">{goal.name}</span>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatFromUSD(goal.current, { maximumFractionDigits: 0 })} / {formatFromUSD(goal.target, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.5, delay: 0.3 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-right text-xs tabular-nums text-muted-foreground">{pct}%</p>
                  {/* #akshitsaini */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => contributeToGoal(goal.id, convertToUSD(100))}
                  >
                    +100
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};