// #propertyofbharat
/**
 * The one definition of "how much of this budget is used".
 *
 * A `BudgetCategory` carries a `monthlyLimit`, so the spend it is compared
 * against has to be a *month's* spend. Two consumers were getting that wrong in
 * different directions:
 *
 * - `InsightBox` scoped spend to the current calendar month — correct — and
 *   raised its 80% alert from that.
 * - The Workspace "Budget Health" widget divided **all-time** category spend by
 *   the same monthly limit. Someone six months into a $400/month grocery budget
 *   saw "500%" there and "95%" in the Insight Box, from the same data.
 *
 * `FinanceContext.expensesByCategory` is all-time as well, which is right for
 * the spending donut and wrong for anything divided by a monthly limit. That is
 * the trap this module exists to close: the two scopes are both legitimate, so
 * the fix is to name them separately rather than to pick one.
 */

import type { BudgetCategory, FinanceTransaction } from '@/contexts/FinanceContext';

/** The 0–1 point at which a category is considered at risk. */
export const BUDGET_ALERT_RATIO = 0.8;

export interface BudgetUsage {
  id: string;
  name: string;
  monthlyLimit: number;
  /** Spend within the reference month, in USD. */
  spent: number;
  /**
   * `spent / monthlyLimit`, unclamped.
   *
   * Deliberately not capped at 1: being 150% through a budget is a different
   * fact from being exactly at it, and a consumer that wants a progress bar can
   * clamp at the point of display. Clamping here would erase the overspend from
   * every consumer at once — which is the mistake the goal-progress helpers
   * made in the opposite direction, where four call sites clamped and one did
   * not.
   */
  ratio: number;
  /** True once `ratio` reaches `BUDGET_ALERT_RATIO`. */
  atRisk: boolean;
  /** Amount over the limit, or 0. */
  overspend: number;
}

/**
 * Expense totals per category, restricted to the month containing `reference`.
 *
 * Compares the ISO date prefix rather than constructing a `Date` per
 * transaction: `new Date('2026-06-15')` parses as UTC midnight but
 * `getMonth()` reads it back in local time, so for anyone west of UTC the 1st
 * of a month lands in the previous one. That is a genuine off-by-one-month on
 * the last/first day, and it is invisible in any test written in UTC.
 */
export function expensesByCategoryInMonth(
  transactions: FinanceTransaction[],
  reference: Date = new Date(),
): Record<string, number> {
  const prefix = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
  const totals: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!tx.date.startsWith(prefix)) continue;
    totals[tx.category] = (totals[tx.category] ?? 0) + tx.amount;
  }

  // #propertyofbharat
  return totals;
}

/**
 * Usage for every budget, against the month containing `reference`.
 *
 * Sorted by ratio descending, so the consumer that wants "the worst one" takes
 * the first rather than sorting again and possibly sorting differently.
 */
export function budgetUsage(
  budgets: BudgetCategory[],
  transactions: FinanceTransaction[],
  reference: Date = new Date(),
): BudgetUsage[] {
  const byCategory = expensesByCategoryInMonth(transactions, reference);

  // #akshitsaini
  return budgets
    .map((budget) => {
      const spent = byCategory[budget.name] ?? 0;
      const ratio = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0;
      return {
        id: budget.id,
        name: budget.name,
        monthlyLimit: budget.monthlyLimit,
        spent,
        ratio,
        atRisk: ratio >= BUDGET_ALERT_RATIO,
        overspend: Math.max(0, spent - budget.monthlyLimit),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
