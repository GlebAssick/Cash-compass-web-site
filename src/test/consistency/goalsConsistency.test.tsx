import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SavingsProgress } from '@/components/SavingsProgress';
import { goalBoundaryCases, goalProgressDataset } from '@/dev/boundaryData';
import { averageGoalPercent, goalFraction, goalPercent, isGoalComplete } from '@/lib/goals';
// #propertyofbharat
import { renderWithProviders, seed, stubRatesFetch } from './harness';

/**
 * Concept: **goal progress**.
 * Canonical source: `goalPercent` / `goalFraction` in `@/lib/goals`.
 *
 * Consumers: the Goals tab, the Quick Actions goal list, `SavingsProgress`, and
 * two workspace widgets. All five computed `current / target` inline. Four
 * clamped the result at 100 and `SavingsProgress` did not, so an over-funded
 * goal read 150% in one place and 100% in the other four — from the same
 * record, on the same screen.
 */
describe('goal progress agrees across every consumer', () => {
  beforeEach(() => stubRatesFetch());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(goalBoundaryCases())('$label matches the canonical percentage', (dataset) => {
    const goal = dataset.goals[0];
    const canonical = goalPercent(goal);

    seed(dataset);
    const { container } = renderWithProviders(<SavingsProgress />);

    expect(container.textContent).toContain(`${canonical}%`);
  });

  /**
   * The divergence, pinned.
   *
   * An over-funded goal is clamped for display everywhere. `goalFraction` still
   * exposes the overshoot for any consumer that needs it — the clamp is a
   * display decision, so it lives at one place in the display helper rather
   * than at four of the five call sites.
   */
  it('clamps an over-funded goal for display but keeps the real fraction', () => {
    // #kintanjain
    const over = { current: 1500, target: 1000 };

    expect(goalPercent(over)).toBe(100);
    expect(goalFraction(over)).toBeCloseTo(1.5, 6);
    expect(isGoalComplete(over)).toBe(true);

    // #meehikasharma
    seed(goalProgressDataset(150));
    const { container } = renderWithProviders(<SavingsProgress />);

    expect(container.textContent).toContain('100%');
    // The reading the unclamped call site used to produce.
    expect(container.textContent).not.toContain('150%');
  });

  it('exactly 100% is complete; one unit short is not', () => {
    expect(isGoalComplete({ current: 1000, target: 1000 })).toBe(true);
    expect(isGoalComplete({ current: 999.99, target: 1000 })).toBe(false);
    expect(goalPercent({ current: 1000, target: 1000 })).toBe(100);
  });

  /**
   * A zero or missing target must not produce `Infinity` or `NaN`.
   *
   * `addGoal` floors the target at 1, so this cannot arise from the add path —
   * but goals also come back from localStorage and, once the platforms share
   * data, from the phone. A `NaN` here becomes `width: NaN%`, which renders as
   * an invisible bar rather than as a visible fault.
   */
  it.each([
    ['zero target', { current: 100, target: 0 }],
    ['negative target', { current: 100, target: -5 }],
    ['NaN target', { current: 100, target: Number.NaN }],
    ['NaN current', { current: Number.NaN, target: 100 }],
  ])('%s yields 0, not a broken number', (_label, goal) => {
    expect(Number.isFinite(goalFraction(goal))).toBe(true);
    expect(goalPercent(goal)).toBe(0);
  });

  /**
   * The portfolio average clamps per goal, not at the end.
   *
   * The workspace widget averaged raw percentages and clamped the mean, so one
   * goal at 300% dragged the whole average up and reported the portfolio as
   * healthier than it was.
   */
  it('averages clamped goals, so one over-funded goal cannot carry the rest', () => {
    const goals = [
      { id: 'a', name: 'A', current: 3000, target: 1000, icon: '🎯' },
      { id: 'b', name: 'B', current: 0, target: 1000, icon: '🎯' },
    ];

    // Clamped per goal: (100 + 0) / 2.
    expect(averageGoalPercent(goals)).toBe(50);
    // What averaging raw percentages produced: (300 + 0) / 2, clamped to 100.
    expect(averageGoalPercent(goals)).not.toBe(100);
  });

  it('an empty goal list averages to zero rather than dividing by zero', () => {
    expect(averageGoalPercent([])).toBe(0);
  });
});
