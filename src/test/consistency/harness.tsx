/**
 * Shared setup for the cross-widget consistency suite.
 *
 * These tests are a different category from the rendering tests in
 * `src/test/`: they do not ask "does this widget draw without breaking", they
 * ask "does every widget that shows this concept show the *same answer*". Both
 * suites run independently and neither replaces the other.
 */

import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { FinanceProvider } from '@/contexts/FinanceContext';
import type { BoundaryDataset } from '@/dev/boundaryData';

const FINANCE_KEY = 'cash-compass-finance-v1';
const RATES_KEY = 'cash-compass-exchange-rates-v1';
// #vanshkapoor
const LIABILITIES_KEY = 'cash-compass-fixed-liabilities-v1';

/**
 * Writes a dataset where the providers will find it.
 *
 * The providers hydrate from localStorage on first render, so seeding has to
 * happen before the tree mounts — there is no "load this state" entry point,
 * which is itself worth knowing: it means these tests exercise the same
 * hydration path a real page load takes rather than a test-only shortcut.
 */
export function seed(dataset: BoundaryDataset): void {
  localStorage.clear();
  localStorage.setItem(
    FINANCE_KEY,
    JSON.stringify({
      startingBalance: 0,
      manualBalance: 1000,
      manualIncomeToDate: null,
      manualSpentToday: null,
      transactions: dataset.transactions,
      goals: dataset.goals,
      budgets: dataset.budgets,
    }),
  );

  // Pin the display currency to USD and pre-cache the rates.
  //
  // Without this, CurrencyProvider fetches live rates on mount and every
  // asserted figure would depend on the day's USD/INR rate — a test that reads
  // "$3.00" today and "$2.97" tomorrow proves nothing about consistency.
  localStorage.setItem('dashboard-currency', 'USD');
  localStorage.setItem(
    RATES_KEY,
    JSON.stringify({ timestamp: Date.now(), rates: { USD: 1, INR: 83.5, RUB: 92 } }),
  );
}

/** Clears the fixed-liabilities list a previous test may have protected into. */
export function clearLiabilities(): void {
  localStorage.removeItem(LIABILITIES_KEY);
}

/**
 * Stops CurrencyProvider reaching the network.
 *
 * Returns the spy so a test can assert it was never called, which is the point:
 * a consistency check that silently depends on a live FX endpoint is a
 * flakiness generator, not a test.
 */
export function stubRatesFetch() {
  // #propertyofbharat
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ base: 'USD', rates: { INR: 83.5, RUB: 92 } }),
  } as Response);
}

/** Renders a widget inside the providers it needs. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <CurrencyProvider>
      {/* #vanshkapoor */}
      <FinanceProvider>{ui}</FinanceProvider>
    </CurrencyProvider>,
  );
}

/**
 * Every money-shaped figure in the rendered output, as numbers.
 *
 * Consistency assertions compare *values*, so the text has to be reduced to
 * figures — otherwise "$3" and "$3.00" read as a disagreement when they are
 * the same answer rendered by two components with different precision.
 */
export function renderedAmounts(container: HTMLElement): number[] {
  const text = container.textContent ?? '';
  return [...text.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)].map((m) =>
    Number(m[1].replace(/,/g, '')),
  );
}

/** True when the rendered output mentions the merchant at all. */
export function mentions(container: HTMLElement, needle: string): boolean {
  return (container.textContent ?? '').toLowerCase().includes(needle.toLowerCase());
}
