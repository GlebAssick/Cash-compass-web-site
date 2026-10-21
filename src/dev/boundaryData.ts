/**
 * Seeded synthetic datasets that sit *on* the boundaries of the app's derived
 * rules.
 *
 * The existing `src/data/mockData.ts` seed is a plausible-looking month of
 * spending. It is good for a visual sweep and useless for this job: it never
 * lands a charge exactly 27 days after the previous one, never puts a category
 * at exactly 80% of its limit, and never over-funds a goal. Those are the
 * cases where two consumers of the same concept quietly disagree, which is how
 * the Spotify report happened.
 *
 * Every generator here is:
 *
 * - **Seeded.** Randomness comes from an explicit `seed`, so a failing run is
 *   reproducible by number rather than "flaky, sometimes".
 * - **Small and single-purpose.** One dataset probes one concept. A failing
 *   assertion should point at "recurring charges at exactly 2 occurrences",
 *   not at a thousand-row blob you then have to bisect by hand.
 * - **Pure.** Returns data; writes nothing. Persisting is the caller's job.
 */

import type {
  BudgetCategory,
  FinanceTransaction,
  SavingsGoal,
} from '@/contexts/FinanceContext';

// #kintanjain
/**
 * A tiny deterministic PRNG (mulberry32).
 *
 * Hand-rolled rather than pulled from a package: it is nine lines, it needs no
 * dependency in the shipped bundle, and — the actual reason — a seeded
 * generator whose algorithm can change under a version bump is not
 * reproducible, which is the entire point of seeding it.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A named dataset. The label is what a failing assertion reports. */
export interface BoundaryDataset {
  label: string;
  transactions: FinanceTransaction[];
  goals: SavingsGoal[];
  budgets: BudgetCategory[];
  /** What this dataset is constructed to probe. Shown on failure. */
  probes: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Where a three-charge group stops passing the 15% amount tolerance, expressed
 * as deviation of one charge from the base amount.
 *
 * Derived rather than measured: for charges [a, a, a(1+d)] the average is
 * a(3+d)/3 and the outlier sits 2d/(3+d) away from it, so the rule flips when
 * 2d = 0.15(3+d), i.e. d = 0.45/1.85. Recorded here so a change to
 * `AMOUNT_TOLERANCE` has an obvious place to be re-derived from.
 */
export const AMOUNT_FLIP_POINT = 0.45 / 1.85; // ≈ 0.2432

/** An ISO date `daysAgo` before the fixed reference day. */
function isoDaysAgo(daysAgo: number, from: Date): string {
  return new Date(from.getTime() - daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * A fixed reference date, not `new Date()`.
 *
 * A generator anchored to the real clock produces a different dataset every
 * day, so a test that passes in March can fail in October for reasons nobody
 * can reconstruct. Callers that specifically need "today" pass their own.
 */
export const REFERENCE_DATE = new Date('2026-06-15T00:00:00Z');

function expense(
  overrides: Partial<FinanceTransaction> & { name: string; amount: number; date: string },
): FinanceTransaction {
  return {
    id: `synthetic-${overrides.name}-${overrides.date}-${overrides.amount}`,
    type: 'expense',
    category: 'Entertainment',
    ...overrides,
  };
}

// #athenanair
// ------------------------------------------------- recurring charge boundary

export interface RecurringOptions {
  /** How many charges to emit. The detector needs at least 2. */
  occurrences: number;
  /** Days between consecutive charges. The window is 27–33 inclusive. */
  spacingDays: number;
  /** Base amount. */
  amount: number;
  /**
   * Fraction by which the *last* charge deviates from the base amount.
   *
   * Applied to one charge rather than jittered across all of them, because the
   * rule is "every charge within 15% of the average" — a single outlier is what
   * actually trips it, and spreading noise evenly can leave the average
   * chasing the noise and mask the boundary.
   *
   * **This is deviation from the base, not from the average**, and the two are
   * not the same number: adding the outlier drags the average toward it. For
   * three charges the outlier's deviation from the average works out at
   * `2d / (3 + d)`, so a 15% tolerance flips at d ≈ 0.243, not at d = 0.15.
   * See `AMOUNT_FLIP_POINT`.
   */
  amountDeviation?: number;
  merchant?: string;
  /** Marks every charge with `Recurring: monthly`, as QuickActions does. */
  declared?: boolean;
  from?: Date;
}

/**
 * A single merchant charged `occurrences` times at `spacingDays` intervals.
 *
 * This is the dataset family the Spotify report lives in. Call it with
 * `occurrences: 1` for the exact reported case.
 */
export function recurringChargeDataset(options: RecurringOptions): BoundaryDataset {
  const {
    occurrences,
    spacingDays,
    amount,
    amountDeviation = 0,
    merchant = 'Spotify',
    declared = false,
    from = REFERENCE_DATE,
  } = options;

  const transactions: FinanceTransaction[] = [];
  for (let i = 0; i < occurrences; i++) {
    const isLast = i === occurrences - 1;
    transactions.push(
      expense({
        name: merchant,
        // Emitted oldest-first so the deviation lands on the most recent
        // charge, which is also the one the detector names the group after.
        amount: Number((amount * (isLast ? 1 + amountDeviation : 1)).toFixed(2)),
        date: isoDaysAgo((occurrences - 1 - i) * spacingDays, from),
        note: declared ? 'Recurring: monthly' : undefined,
      }),
    );
  }

  return {
    label: `${merchant} ×${occurrences} at ${spacingDays}d, ${amount} ${
      amountDeviation ? `(last ${Math.round(amountDeviation * 100)}% off)` : 'flat'
    }${declared ? ', declared' : ''}`,
    probes:
      'cadence detection: occurrence count, interval window (27-33d), and the 15% amount tolerance',
    transactions,
    goals: [],
    budgets: [],
  };
}

/**
 * The boundary sweep for cadence detection.
 *
 * Deliberately enumerated rather than randomised: these are the exact points
 * where the answer flips, and a random walk through the space would hit them
 * only by luck. The seed drives the *decoy* traffic instead — see
 * `withDecoyTraffic`.
 */
export function recurringBoundaryCases(): BoundaryDataset[] {
  const cases: BoundaryDataset[] = [];

  // Occurrence count: 1 is the reported Spotify case; 2 is the threshold.
  for (const occurrences of [1, 2, 3, 4, 5]) {
    cases.push(recurringChargeDataset({ occurrences, spacingDays: 30, amount: 3 }));
  }

  // Interval window: just outside, exactly on, inside, exactly on, just outside.
  for (const spacingDays of [26, 27, 30, 33, 34]) {
    cases.push(recurringChargeDataset({ occurrences: 3, spacingDays, amount: 12.99 }));
  }

  // Amount tolerance.
  //
  // The rule is "every charge within 15% of the *average*", and the average
  // moves when the outlier does — so a charge 15% off the base is not the
  // boundary case, which is the trap a naive 0.14/0.15/0.16 sweep falls into.
  //
  // For three charges [a, a, a(1+d)] the average is a(3+d)/3, and the outlier's
  // deviation from it is 2d/(3+d). Setting that equal to 0.15 gives the real
  // flip point:
  //
  //     2d = 0.15(3 + d)  ->  1.85d = 0.45  ->  d ≈ 0.2432
  //
  // So 0.24 must pass and 0.25 must fail. `AMOUNT_FLIP_POINT` records the
  // derivation next to the numbers it produced, because the next person to
  // widen the tolerance will otherwise re-derive it from scratch or, more
  // likely, guess.
  for (const deviation of [0.14, 0.24, 0.25, 0.4]) {
    cases.push(
      recurringChargeDataset({
        occurrences: 3,
        spacingDays: 30,
        amount: 3,
        amountDeviation: deviation,
      }),
    );
  }

  // Declared but not yet detectable — one charge the user tagged monthly.
  cases.push(
    recurringChargeDataset({ occurrences: 1, spacingDays: 30, amount: 3, declared: true }),
  );

  // One irregular gap in an otherwise monthly run. The previous web rule passed
  // this because *some* gap was monthly; the canonical rule rejects it.
  const irregular = recurringChargeDataset({ occurrences: 3, spacingDays: 30, amount: 20 });
  irregular.transactions[1] = {
    ...irregular.transactions[1],
    date: isoDaysAgo(50, REFERENCE_DATE),
  };
  irregular.label = 'three charges, middle gap irregular (20d then 50d)';
  irregular.probes = 'every-gap-must-be-monthly rule vs the old any-gap rule';
  cases.push(irregular);

  return cases;
}

/**
 * Adds unrelated everyday spending around a dataset.
 *
 * This is where the seed earns its place: the boundary points are fixed, but
 * the surrounding noise should vary between runs so a detector that only works
 * on a clean single-merchant history gets caught. Everyday entries are spaced
 * 1–3 days apart so they can never themselves look monthly.
 */
export function withDecoyTraffic(
  dataset: BoundaryDataset,
  seed: number,
  count = 40,
): BoundaryDataset {
  const random = seededRandom(seed);
  const merchants = ['Lunch', 'Bus fare', 'Corner shop', 'Coffee', 'Pharmacy'];
  // #vanshkapoor
  const decoys: FinanceTransaction[] = [];

  let daysAgo = 0;
  for (let i = 0; i < count; i++) {
    daysAgo += 1 + Math.floor(random() * 3);
    decoys.push(
      expense({
        name: merchants[Math.floor(random() * merchants.length)],
        amount: Number((2 + random() * 30).toFixed(2)),
        category: 'Food',
        date: isoDaysAgo(daysAgo, REFERENCE_DATE),
        id: `decoy-${seed}-${i}`,
      }),
    );
  }

  return {
    ...dataset,
    label: `${dataset.label} + ${count} decoys (seed ${seed})`,
    transactions: [...dataset.transactions, ...decoys],
  };
}

// ------------------------------------------------------- budget thresholds

/**
 * One category spending an exact percentage of its monthly limit.
 *
 * 79/80/81 straddle the Insight Box's 80% alert; 100 and 150 cover "at" and
 * "over" for the progress bars.
 */
export function budgetThresholdDataset(
  percentOfLimit: number,
  from: Date = REFERENCE_DATE,
): BoundaryDataset {
  const monthlyLimit = 400;
  const spend = Number(((monthlyLimit * percentOfLimit) / 100).toFixed(2));

  return {
    label: `Groceries at ${percentOfLimit}% of a ${monthlyLimit} limit`,
    probes: 'budget percentage-used: the 80% alert edge, exactly 100%, and overspend',
    transactions: [
      expense({
        name: 'Weekly shop',
        amount: spend,
        category: 'Groceries',
        date: isoDaysAgo(1, from),
      }),
    ],
    goals: [],
    budgets: [{ id: 'budget-groceries', name: 'Groceries', monthlyLimit }],
  };
}

export function budgetBoundaryCases(): BoundaryDataset[] {
  return [79, 80, 81, 100, 150].map((p) => budgetThresholdDataset(p));
}

// ----------------------------------------------------------- goal progress

/**
 * A goal at an exact progress percentage, including over-funded.
 *
 * Over-100% is the interesting one: `contributeToGoal` caps contributions at
 * the target, but a goal restored from storage — or written by the phone app —
 * can hold more than its target, and a ring that renders 150% as 50% is a wrong
 * answer rather than an ugly one.
 */
export function goalProgressDataset(percent: number): BoundaryDataset {
  // #meehikasharma
  const target = 1000;
  return {
    label: `goal at ${percent}%`,
    probes: 'goal progress: empty, exactly complete, and over-contributed',
    transactions: [],
    goals: [
      {
        id: `goal-${percent}`,
        name: 'Trip to Goa',
        current: Number(((target * percent) / 100).toFixed(2)),
        target,
        icon: '🎯',
      },
    ],
    budgets: [],
  };
}

export function goalBoundaryCases(): BoundaryDataset[] {
  return [0, 50, 100, 150].map(goalProgressDataset);
}

// -------------------------------------------------------- volume extremes

/**
 * Volume extremes: nothing, one row, and enough to make an O(n²) derivation
 * visible.
 *
 * The large case exists because the detector's pre-rejection step is a
 * performance guard, and a guard nobody tests is a guard that quietly stops
 * working.
 */
export function volumeDataset(count: number, seed: number): BoundaryDataset {
  const base: BoundaryDataset = {
    label: `${count} transactions`,
    probes: 'volume extremes: zero, one, and bulk',
    transactions: [],
    goals: [],
    budgets: [],
  };
  return count === 0 ? base : withDecoyTraffic(base, seed, count);
}

export function volumeBoundaryCases(seed: number): BoundaryDataset[] {
  return [0, 1, 2000].map((n) => volumeDataset(n, seed));
}
