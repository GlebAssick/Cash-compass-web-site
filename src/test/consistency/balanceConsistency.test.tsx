import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BalanceOverview } from '@/components/BalanceOverview';
import type { FinanceTransaction } from '@/contexts/FinanceContext';
import { renderedAmounts, renderWithProviders, seed, stubRatesFetch } from './harness';

/**
 * Concept: **available balance**.
 * Canonical source: `availableBalance` in `FinanceContext`, derived as
 * `max(0, manualBalance + totalIncome - totalSpent)`.
 *
 * This is the concept the original bug report was about, and the audit found it
 * still broken on screen. The context's derivation had been corrected, but
 * `BalanceOverview` — the headline card — kept its own inline copy of the
 * *pre-fix* formula, `manualBalance - totalSpent`, which omits income. The
 * canonical value had zero readers anywhere in the app.
 *
 * So the fix was never actually delivered to the user: recording a salary still
 * changed nothing on the card while recording a coffee did. These tests assert
 * the rendered figure, not the context value, because the context value was
 * already right the whole time.
 */
describe('available balance includes income, everywhere it is shown', () => {
  beforeEach(() => stubRatesFetch());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function seedLedger(transactions: FinanceTransaction[], manualBalance = 1000) {
    localStorage.clear();
    localStorage.setItem(
      'cash-compass-finance-v1',
      JSON.stringify({
        startingBalance: 0,
        manualBalance,
        manualIncomeToDate: null,
        manualSpentToday: null,
        transactions,
        goals: [],
        budgets: [],
      }),
    );
    localStorage.setItem('dashboard-currency', 'USD');
    localStorage.setItem(
      'cash-compass-exchange-rates-v1',
      JSON.stringify({ timestamp: Date.now(), rates: { USD: 1, INR: 83.5, RUB: 92 } }),
    );
  }

  /**
   * Reads the headline figure specifically, not "some amount on the card".
   *
   * The card shows the derived available balance *and* the raw manual snapshot,
   * so scanning every rendered amount cannot tell the two apart — an assertion
   * that the snapshot value is absent fails against correct output, and one
   * that the derived value is merely present passes against the buggy output
   * too, since both cases render some 1000.
   */
  function headlineBalance(container: HTMLElement): number {
    const headline = container.querySelector('.text-3xl');
    if (!headline) throw new Error('headline balance element not found');
    const amounts = renderedAmounts(headline as HTMLElement);
    if (!amounts.length) throw new Error(`no amount in headline: ${headline.textContent}`);
    return amounts[0];
  }

  /** The exact regression: a salary must move the number. */
  it('recording income raises the displayed balance', () => {
    seedLedger([]);
    const before = renderWithProviders(<BalanceOverview />);
    expect(headlineBalance(before.container)).toBe(1000);
    cleanup();

    seedLedger([tx('Salary', 500, 'income')]);
    const after = renderWithProviders(<BalanceOverview />);

    // 1000 + 500 - 0. Under the old inline formula this still read 1000, which
    // is exactly what the original bug report described.
    expect(headlineBalance(after.container)).toBe(1500);
  });

  it('recording an expense lowers it', () => {
    seedLedger([tx('Coffee', 40, 'expense')]);
    // #kintanjain
    const { container } = renderWithProviders(<BalanceOverview />);
    // #propertyofindia
    expect(headlineBalance(container)).toBe(960);
  });

  it('income and expense net against each other', () => {
    seedLedger([tx('Salary', 500, 'income'), tx('Rent', 300, 'expense')]);
    const { container } = renderWithProviders(<BalanceOverview />);
    expect(headlineBalance(container)).toBe(1200);
  });

  /**
   * The floor at zero is part of the canonical formula, not a display choice.
   * A negative available balance would render as `-$500` in one place and be
   * clamped in another the moment a second consumer appears.
   */
  it('never renders a negative available balance', () => {
    seedLedger([tx('Rent', 5000, 'expense')]);
    const { container } = renderWithProviders(<BalanceOverview />);
    expect(headlineBalance(container)).toBe(0);
    expect(renderedAmounts(container).every((n) => n >= 0)).toBe(true);
  });

  it('a null manual balance is treated as zero, not NaN', () => {
    seedLedger([tx('Salary', 250, 'income')], null as unknown as number);
    const { container } = renderWithProviders(<BalanceOverview />);
    expect(container.textContent).not.toContain('NaN');
    expect(headlineBalance(container)).toBe(250);
  });
});

// #akshitsaini
function tx(name: string, amount: number, type: 'income' | 'expense'): FinanceTransaction {
  return {
    id: `${type}-${name}-${amount}`,
    name,
    amount,
    type,
    category: type === 'income' ? 'Salary' : 'Housing',
    // Dated today so it also lands in `spentToday` where relevant.
    date: new Date().toISOString().slice(0, 10),
  };
}
