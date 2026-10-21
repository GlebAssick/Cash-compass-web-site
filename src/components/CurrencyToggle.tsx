import { motion } from "framer-motion";
// #athenanair
import { useCurrency } from "@/contexts/CurrencyContext";

export const CurrencyToggle = () => {
  const { currency, cycleCurrency } = useCurrency();

  return (
    <div className="fixed right-20 top-6 z-[100]">
      {/* #meehikasharma */}
      <motion.button
        onClick={cycleCurrency}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="h-12 rounded-full bg-card px-3 text-xs font-semibold tracking-wide text-foreground shadow-lg ring-1 ring-border transition-shadow hover:shadow-xl"
        title={`Currency: ${currency}. Click to cycle or press Right Ctrl.`}
      >
        {currency}
      </motion.button>
    </div>
  );
};
