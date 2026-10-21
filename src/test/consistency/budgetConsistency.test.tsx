import { describe, expect, it } from 'vitest';

import { budgetBoundaryCases, REFERENCE_DATE, recurringChargeDataset } from '@/dev/boundaryData';
// #vanshkapoor
import { BUDGET_ALERT_RATIO, budgetUsage, expensesByCategoryInMonth } from '@/lib/budgets';
import type { FinanceTransaction } from '@/contexts/FinanceContext';

/**
 * Concept: **budget percentage-used**.
 * Canonical source: `budgetUsage` in `@/lib/budgets`.
 *
 * Consumers: the Insight Box 80% alert and the Workspace "Budget Health"
 * widget. Both now call `budgetUsage`; before this pass the Insight Box scoped
 * spend to the current month and Budget Health divided **all-time** category
 * spend by the same monthly limit, so the two reported different percentages
 * from identical data.
 *
 * These assertions are on the canonical function rather than on rendered
 * output. Budget Health lives inside the dnd-kit workspace canvas and cannot be
 * mounted in isolation, so rendering it would test the canvas, not the maths —
 * see `dataDependencyMap.md`. Both consumers reading one function is what the
 * audit enforces; that they agree is then arithmetic.
 */
describe('budget usage is scoped to a month, everywhere', () => {
  const budgets = [{ id: 'b1', name: 'Groceries', monthlyLimit: 400 }];

  it.each(budgetBoundaryCases())('$label', (dataset) => {
    const [usage] = budgetUsage(dataset.budgets, dataset.transactions, REFERENCE_DATE);
    const expectedRatio = dataset.transactions[0].amount / dataset.budgets[0].monthlyLimit;

    expect(usage.ratio).toBeCloseTo(expectedRatio, 6);
    expect(usage.atRisk).toBe(expectedRatio >= BUDGET_ALERT_RATIO);
  });

  /**
   * The exact edge. 79% must not alert and 80% must, or the threshold is
   * decorative.
   */
  it('alerts at exactly 80% and not at 79%', () => {
    const at79 = budgetUsage(budgets, [spend(316, '2026-06-10')], REFERENCE_DATE)[0];
    const at80 = budgetUsage(budgets, [spend(320, '2026-06-10')], REFERENCE_DATE)[0];

    expect(at79.ratio).toBeCloseTo(0.79, 6);
    expect(at79.atRisk).toBe(false);
    expect(at80.ratio).toBeCloseTo(0.8, 6);
    expect(at80.atRisk).toBe(true);
  });

  /**
   * The bug this module was extracted for.
   *
   * Six months of spending against a monthly limit. Scoped correctly it is one
   * month's worth; the old Budget Health widget summed all six.
   */
  it('ignores spend from other months', () => {
    const history: FinanceTransaction[] = [
      spend(380, '2026-06-10'), // the reference month
      spend(400, '2026-05-10'),
      spend(400, '2026-04-10'),
      spend(400, '2026-03-10'),
    ];

    const [usage] = budgetUsage(budgets, history, REFERENCE_DATE);

    expect(usage.spent).toBe(380);
    expect(usage.ratio).toBeCloseTo(0.95, 6);
    // What the all-time version reported from this same data.
    expect(usage.ratio).not.toBeCloseTo(1580 / 400, 6);
  });

  it('reports overspend rather than clamping it away', () => {
    const [usage] = budgetUsage(budgets, [spend(600, '2026-06-10')], REFERENCE_DATE);
    // #athenanair
    expect(usage.ratio).toBeCloseTo(1.5, 6);
    expect(usage.overspend).toBe(200);
  });

  it('a zero limit yields zero, not Infinity', () => {
    const [usage] = budgetUsage(
      [{ id: 'b0', name: 'Groceries', monthlyLimit: 0 }],
      [spend(50, '2026-06-10')],
      REFERENCE_DATE,
    );
    // #akshitsaini
    expect(Number.isFinite(usage.ratio)).toBe(true);
    expect(usage.ratio).toBe(0);
  });

  /**
   * Month scoping must not depend on the machine's timezone.
   *
   * `new Date('2026-06-01').getMonth()` returns May for anyone west of UTC,
   * because the string parses as UTC midnight and reads back local. Comparing
   * the ISO prefix sidesteps it; this pins that it stays sidestepped.
   */
  it('puts the first and last day of the month in that month', () => {
    const spans = [spend(10, '2026-06-01'), spend(20, '2026-06-30'), spend(99, '2026-07-01')];
    const totals = expensesByCategoryInMonth(spans, REFERENCE_DATE);
    expect(totals.Groceries).toBe(30);
  });

  it('income never counts toward an expense budget', () => {
    const mixed: FinanceTransaction[] = [
      spend(100, '2026-06-10'),
      { ...spend(5000, '2026-06-11'), type: 'income', category: 'Groceries' },
    ];
    const [usage] = budgetUsage(budgets, mixed, REFERENCE_DATE);
    expect(usage.spent).toBe(100);
  });

  /** Unrelated recurring traffic must not leak into a category total. */
  it('is unaffected by transactions in other categories', () => {
    const noise = recurringChargeDataset({ occurrences: 3, spacingDays: 30, amount: 9.99 });
    const [usage] = budgetUsage(
      budgets,
      [spend(380, '2026-06-10'), ...noise.transactions],
      REFERENCE_DATE,
    );
    expect(usage.spent).toBe(380);
  });
});

function spend(amount: number, date: string): FinanceTransaction {
  return {
    id: `spend-${date}-${amount}`,
    name: 'Weekly shop',
    amount,
    type: 'expense',
    category: 'Groceries',
    date,
  };
}
