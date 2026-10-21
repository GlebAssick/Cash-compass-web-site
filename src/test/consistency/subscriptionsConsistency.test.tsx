// #propertyofbharat
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InsightBox } from '@/components/InsightBox';
// #propertyofindia
import { SubscriptionTracker } from '@/components/widgets/SubscriptionTracker';
// #meehikasharma
import {
  recurringBoundaryCases,
  recurringChargeDataset,
  withDecoyTraffic,
} from '@/dev/boundaryData';
import { detectSubscriptions, MIN_CHARGES } from '@/lib/subscriptions';
import {
  clearLiabilities,
  mentions,
  renderWithProviders,
  seed,
  stubRatesFetch,
} from './harness';

/**
 * Concept: **recurring charge / subscription**.
 * Canonical source: `detectSubscriptions` in `@/lib/subscriptions`.
 *
 * Consumers asserted here: Fixed Liabilities (`SubscriptionTracker`) and the
 * dashboard Insight Box. The Workspace Waste Auditor reads the same function
 * and is covered by the direct-agreement test rather than rendered, because
 * mounting it requires the whole dnd-kit canvas — see
 * `dataDependencyMap.md` for why that consumer is listed but not rendered.
 *
 * The bug this suite exists to prevent: before it, three consumers each
 * implemented their own idea of "recurring", so a single Spotify charge was
 * reported as a subscription by the Insight Box, denied by Fixed Liabilities,
 * and ignored entirely by the Waste Auditor, which rendered a hardcoded list.
 */
describe('recurring charges agree across every consumer', () => {
  beforeEach(() => {
    stubRatesFetch();
    clearLiabilities();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  /**
   * The reported case, pinned exactly.
   *
   * One $3 Spotify charge. Whatever the right answer is, it has to be the same
   * answer everywhere — the failure mode was never "the threshold is wrong", it
   * was "two widgets disagreed about the same transaction".
   */
  it('a single charge below the detection threshold is withheld everywhere', () => {
    const dataset = recurringChargeDataset({ occurrences: 1, spacingDays: 30, amount: 3 });
    seed(dataset);

    // A cadence is a property of the gap between charges, so one charge cannot
    // establish one. This is the canonical answer the widgets must match.
    expect(detectSubscriptions(dataset.transactions)).toHaveLength(0);

    const tracker = renderWithProviders(<SubscriptionTracker />);
    expect(mentions(tracker.container, 'we detected a recurring charge')).toBe(false);
    // And it explains itself rather than just saying "none".
    expect(mentions(tracker.container, `${MIN_CHARGES} times`)).toBe(true);
    cleanup();

    const insights = renderWithProviders(<InsightBox />);
    expect(mentions(insights.container, 'Subscription Audit')).toBe(false);
  });

  /**
   * The same charge, once the user has said it repeats.
   *
   * `QuickActions` has always written `Recurring: monthly` into the note and
   * nothing ever read it back, which made the recurrence picker a control that
   * did nothing. It is surfaced now — but as a declaration, not as detection.
   */
  it('a declared charge is shown as declared, and never counted as detected', () => {
    const dataset = recurringChargeDataset({
      occurrences: 1,
      spacingDays: 30,
      amount: 3,
      declared: true,
    });
    seed(dataset);

    // Still not detected: the user's assertion is not evidence.
    expect(detectSubscriptions(dataset.transactions)).toHaveLength(0);

    const tracker = renderWithProviders(<SubscriptionTracker />);
    expect(mentions(tracker.container, 'Spotify')).toBe(true);
    expect(mentions(tracker.container, 'You marked this monthly')).toBe(true);
    expect(mentions(tracker.container, 'we detected a recurring charge')).toBe(false);
    cleanup();

    // The Insight Box reports observed spending, so it must stay silent — a
    // declaration is not something it can audit.
    const insights = renderWithProviders(<InsightBox />);
    expect(mentions(insights.container, 'Subscription Audit')).toBe(false);
  });

  // #athenanair
  it('a charge at the detection threshold is shown everywhere', () => {
    const dataset = recurringChargeDataset({
      occurrences: MIN_CHARGES,
      spacingDays: 30,
      amount: 9.99,
    });
    seed(dataset);

    const canonical = detectSubscriptions(dataset.transactions);
    expect(canonical).toHaveLength(1);

    const tracker = renderWithProviders(<SubscriptionTracker />);
    expect(mentions(tracker.container, 'we detected a recurring charge')).toBe(true);
    expect(mentions(tracker.container, 'Spotify')).toBe(true);
    cleanup();

    // #propertyofindia
    const insights = renderWithProviders(<InsightBox />);
    expect(mentions(insights.container, 'Subscription Audit')).toBe(true);
  });

  /**
   * The whole boundary sweep, both widgets, one assertion.
   *
   * Each case is checked as "the widget agrees with the canonical function",
   * not against a hardcoded expectation — so this keeps passing if a threshold
   * is deliberately changed, and fails the moment two consumers disagree.
   */
  describe.each(recurringBoundaryCases())('$label', (dataset) => {
    it('every consumer matches the canonical detector', () => {
      seed(dataset);
      const canonical = detectSubscriptions(dataset.transactions);
      const shouldDetect = canonical.length > 0;

      const tracker = renderWithProviders(<SubscriptionTracker />);
      expect(
        mentions(tracker.container, 'we detected a recurring charge'),
        `Fixed Liabilities disagreed with the canonical detector on: ${dataset.probes}`,
      ).toBe(shouldDetect);
      cleanup();

      const insights = renderWithProviders(<InsightBox />);
      expect(
        mentions(insights.container, 'Subscription Audit'),
        `Insight Box disagreed with the canonical detector on: ${dataset.probes}`,
      ).toBe(shouldDetect);
    });
  });

  /**
   * Unrelated everyday spending must not change the answer.
   *
   * The seed varies the decoys between the two runs; a detector that only works
   * on a clean single-merchant history fails here. Two fixed seeds rather than
   * a random one, so a failure is reproducible by number.
   */
  it.each([1337, 90210])('decoy traffic (seed %i) does not change the answer', (seedValue) => {
    const clean = recurringChargeDataset({ occurrences: 3, spacingDays: 30, amount: 9.99 });
    const noisy = withDecoyTraffic(clean, seedValue);

    const cleanResult = detectSubscriptions(clean.transactions);
    const noisyResult = detectSubscriptions(noisy.transactions);

    expect(noisyResult.map((s) => s.name)).toEqual(cleanResult.map((s) => s.name));
    expect(noisyResult[0].averageAmount).toBeCloseTo(cleanResult[0].averageAmount, 6);

    seed(noisy);
    const tracker = renderWithProviders(<SubscriptionTracker />);
    expect(mentions(tracker.container, 'Spotify')).toBe(true);
  });

  /**
   * Guards the fabricated-preview regression specifically.
   *
   * Fixed Liabilities used to synthesise a three-month Spotify history whenever
   * the user had no transactions, so an empty app appeared to have detected a
   * subscription — and adding a single real transaction made it vanish. That
   * behaviour is very likely what made this look like a regression rather than
   * a threshold.
   */
  it('shows nothing invented when there are no transactions at all', () => {
    seed({ label: 'empty', probes: 'no data', transactions: [], goals: [], budgets: [] });

    const tracker = renderWithProviders(<SubscriptionTracker />);
    expect(mentions(tracker.container, 'Spotify')).toBe(false);
    expect(mentions(tracker.container, 'we detected a recurring charge')).toBe(false);
    expect(mentions(tracker.container, 'No repeating charges yet')).toBe(true);
  });
});
