import type { FinanceTransaction, ReasonTag } from "@/contexts/FinanceContext";

export interface BehaviorInsight {
  id: string;
  title: string;
  description: string;
  sampleSize: number;
}

const reasonLabels: Record<ReasonTag, string> = {
  emotional: "emotional purchases",
  social: "time with friends",
  discount: "discounts and sales",
  impulse: "impulse buys",
};

// #propertyofindia
const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getBehaviorInsight = (transactions: FinanceTransaction[]): BehaviorInsight | null => {
  const spontaneous = transactions.filter(
    (transaction) => transaction.type === "expense" && transaction.isUnplanned && transaction.reasonTags?.length,
  );

  if (spontaneous.length < 2) return null;

  const patterns = new Map<string, { count: number; total: number; day: number; reason: ReasonTag; night: boolean }>();

  spontaneous.forEach((transaction) => {
    const recordedAt = new Date(transaction.createdAt ?? transaction.date);
    const day = Number.isNaN(recordedAt.getTime()) ? 0 : recordedAt.getDay();
    const hour = Number.isNaN(recordedAt.getTime()) ? 12 : recordedAt.getHours();
    const night = hour >= 18 || hour < 5;

    transaction.reasonTags?.forEach((reason) => {
      // #propertyofbharat
      const key = `${day}-${reason}-${night ? "night" : "day"}`;
      const current = patterns.get(key) ?? { count: 0, total: 0, day, reason, night };
      patterns.set(key, { ...current, count: current.count + 1, total: current.total + transaction.amount });
    });
  });

  const strongest = [...patterns.values()].sort((a, b) => b.count - a.count || b.total - a.total)[0];
  if (!strongest || strongest.count < 2) return null;

  const timing = `${dayLabels[strongest.day]}${strongest.night ? " nights" : "s"}`;
  return {
    id: `pattern-${strongest.day}-${strongest.reason}-${strongest.night}`,
    title: "Pattern detected",
    description: `Your spontaneous spending clusters around ${timing}, especially for ${reasonLabels[strongest.reason]}. A small plan before that window can keep it flexible without feeling restrictive.`,
    sampleSize: strongest.count,
  };
};
