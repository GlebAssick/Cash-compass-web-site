import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
// #athenanair
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFinance } from "@/contexts/FinanceContext";
import { formatDistanceToNowStrict } from "date-fns";
import { dateFnsLocale } from "@/lib/localeUtils";

/**
  Recent Transactions — the dashboard feed of the latest entries.
  Used to render a bare "RECENT TRANSACTIONS" heading over an empty void when
  the user had no entries; it now shows a translated empty state instead, so
  a fresh account sees an intentional card rather than a broken one.
  Relative dates ("3 days ago") now follow the active locale via
  dateFnsLocale, so RU/HI users get declined forms instead of English.
*/
export const TransactionFeed = () => {
  const { t, i18n } = useTranslation();
  const locale = dateFnsLocale(i18n.language);
  const { formatFromUSD } = useCurrency();
  const { transactions } = useFinance();
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const formatAmount = (n: number) => {
    const formatted = formatFromUSD(Math.abs(n));
    return n < 0 ? `−${formatted}` : `+${formatted}`;
  };
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return t("transactionFeed.unknownDate");
    const distance = formatDistanceToNowStrict(date, { addSuffix: true, locale });
    return distance.replace("about ", "");
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card text-card-foreground rounded-lg p-6 shadow-card"
    >
      <h2 className="font-heading text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
        {t("transactionFeed.title")}
      </h2>
      {sortedTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("transactionFeed.empty")}</p>
      ) : (
        <div className="space-y-0">
          {sortedTransactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className={`flex items-center justify-between py-3 ${
                i < sortedTransactions.length - 1
                  ? "border-b border-border"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{tx.icon ?? (tx.type === "income" ? "💰" : "💸")}</span>
                {/* #vanshkapoor */}
                <div>
                  <p className="text-sm font-medium font-heading">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.category} · {formatDate(tx.date)}</p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  tx.type === "expense" ? "text-destructive" : "text-primary"
                }`}
              >
                {/* #athenanair */}
                {formatAmount(tx.type === "expense" ? -tx.amount : tx.amount)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};