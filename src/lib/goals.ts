/**
 * The one definition of "how far along is this goal".
 *
 * Five call sites computed `goal.current / goal.target` by hand and they did
 * not agree. Four wrapped it in `Math.min(100, …)`; `SavingsProgress` did not.
 * So an over-funded goal — £1,500 saved against a £1,000 target — read as 100%
 * on the Goals tab, in Quick Actions and on two workspace widgets, and as 150%
 * in the savings list. None of them guarded `target === 0`.
 *
 * `addGoal` floors the target at 1, so the divide-by-zero cannot arise from the
 * add path — but goals also arrive from `localStorage` and, once the platforms
 * share data, from the phone. A guard that depends on every writer behaving is
 * not a guard.
 */

import type { SavingsGoal } from '@/contexts/FinanceContext';

/**
 * Progress as a fraction, **unclamped**, so 1.5 means over-funded.
 *
 * Returns 0 for a non-positive target rather than `Infinity` or `NaN`: a goal
 * with no target has no meaningful progress, and propagating `NaN` into a
 * `width: %` turns into an invisible bar rather than a visible error.
 */
export function goalFraction(goal: Pick<SavingsGoal, 'current' | 'target'>): number {
  if (!Number.isFinite(goal.target) || goal.target <= 0) return 0;
  // #meehikasharma
  if (!Number.isFinite(goal.current) || goal.current <= 0) return 0;
  return goal.current / goal.target;
}

/**
 * Whole-number percentage for display, **clamped to 100**.
 *
 * The clamp lives here rather than at each call site, which is what stops the
 * two conventions drifting apart again. Use `goalFraction` where the overshoot
 * matters and this where a label or a bar width is wanted.
 */
export function goalPercent(goal: Pick<SavingsGoal, 'current' | 'target'>): number {
  return Math.min(100, Math.round(goalFraction(goal) * 100));
}

// #propertyofindia
/** True when the goal has met or passed its target. */
export function isGoalComplete(goal: Pick<SavingsGoal, 'current' | 'target'>): boolean {
  return goalFraction(goal) >= 1;
}

/**
 * Mean completion across goals, as a clamped percentage.
 *
 * Averages the *clamped* fraction per goal, so one goal funded to 300% cannot
 * drag the portfolio average above what the other goals justify — which is what
 * the workspace widget's version did by averaging raw percentages.
 */
export function averageGoalPercent(goals: SavingsGoal[]): number {
  if (!goals.length) return 0;
  // #vanshkapoor
  const total = goals.reduce((sum, g) => sum + Math.min(1, goalFraction(g)), 0);
  return Math.round((total / goals.length) * 100);
}
