/**
 * The one definition of "recurring charge" in the web app.
 *
 * Before this module there were four, and they disagreed:
 *
 * 1. `SubscriptionTracker` ran real cadence detection (≥2 charges, monthly
 *    spacing, consistent amounts) — the strictest of the four.
 * 2. `InsightBox` matched a hardcoded merchant regex
 *    (`/netflix|spotify|subscription|prime|youtube/i`) that fires on a *single*
 *    transaction and cannot see a recurring charge from any other merchant.
 * 3. The Workspace "Waste Auditor" rendered a literal array — Streaming
 *    $15.99, Cloud Storage $9.99, Gym $49.99 — and read no user data at all.
 * 4. `QuickActions` wrote `Recurring: monthly` into the transaction note and
 *    nothing ever read it back.
 *
 * That is why one Spotify charge appeared in the Insight Box and not in Fixed
 * Liabilities. Every consumer now reads this module instead.
 *
 * The rules are a deliberate port of `mobile/lib/logic/subscriptions.dart`,
 * which is the more rigorous of the two implementations and is unit-tested on
 * that side. Mirroring it rather than keeping the looser web rules means the
 * phone and the browser answer this question identically — see
 * `mobile/PARITY_SPEC.md` for why that matters.
 */

import type { FinanceTransaction } from '@/contexts/FinanceContext';

/** A merchant charging on a roughly monthly cadence. */
export interface DetectedSubscription {
  /** Display name, taken from the most recent charge. */
  name: string;
  averageAmount: number;
  chargeCount: number;
  averageIntervalDays: number;
  /** ISO date of the most recent charge. */
  lastCharged: string;
}

/** Words that describe the charge rather than the merchant. */
const NOISE_WORDS = new Set(['payment', 'subscription', 'monthly']);

/**
 * Normalises a merchant name so "Netflix 04/2026" and "NETFLIX payment" group
 * together.
 *
 * A single character walk rather than a chain of `replace` calls: the previous
 * web version built four RegExp objects *per call*, and this runs once per
 * transaction, so regex construction dominated the whole detection pass.
 * Digits, punctuation and whitespace are all handled by the one non-letter
 * branch.
 */
export function merchantSignature(name: string): string {
  const words: string[] = [];
  let word = '';

  const flush = () => {
    if (!word) return;
    const w = word;
    word = '';
    if (NOISE_WORDS.has(w)) return;
    words.push(w);
  };

  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    if (c >= 0x41 && c <= 0x5a) {
      word += String.fromCharCode(c + 32); // fold A-Z to a-z
    } else if (c >= 0x61 && c <= 0x7a) {
      word += String.fromCharCode(c);
    } else {
      flush();
    }
  }
  flush();

  return words.join(' ');
}

/**
 * Parses an ISO `yyyy-MM-dd` date at UTC midnight.
 *
 * Explicitly UTC. Parsing a bare date string in local time makes a gap across
 * a daylight-saving boundary come out as 29.96 days, which floors to 29 — still
 * inside the window here, but the same off-by-one lands exactly on the 27-day
 * edge for a charge billed on the 1st. Dart's `DateTime.tryParse` on a bare
 * date has no such wobble, so this keeps the two platforms in step.
 */
function parseIso(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    const fallback = Date.parse(date);
    return Number.isNaN(fallback) ? null : fallback;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// #propertyofbharat
const MS_PER_DAY = 86_400_000;

/** Smallest and largest gap, in days, that still reads as monthly. */
export const MIN_INTERVAL_DAYS = 27;
export const MAX_INTERVAL_DAYS = 33;

/** How far an individual charge may sit from the average, as a fraction. */
export const AMOUNT_TOLERANCE = 0.15;

/** Charges needed before a cadence can be claimed at all. */
export const MIN_CHARGES = 2;

/**
 * Finds merchants charged on a 27–33 day cadence with consistent amounts.
 *
 * Two thresholds, both inherited from the original web implementation and kept
 * because they are the ones the mobile app ships: the day window tolerates
 * months of different lengths, and amounts must sit within 15% of the average
 * so a variable bill (a supermarket, a fuel stop) is not mistaken for a
 * subscription.
 *
 * Note `MIN_CHARGES` is 2, not 1, and that is not an arbitrary cut-off: a
 * cadence is a property of the *gap between* charges, so a single transaction
 * carries no evidence of one no matter how subscription-like the merchant name
 * looks. A user who knows their charge is monthly can say so — see
 * `declaredRecurrence`.
 */
export function detectSubscriptions(transactions: FinanceTransaction[]): DetectedSubscription[] {
  const groups = new Map<string, FinanceTransaction[]>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const key = merchantSignature(t.name);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) existing.push(t);
    else groups.set(key, [t]);
  }

  const detected: DetectedSubscription[] = [];

  for (const charges of groups.values()) {
    if (charges.length < MIN_CHARGES) continue;

    // Cheap rejection before any date parsing.
    //
    // Charges spaced at least 27 days apart can only fit (span / 27) + 1 times
    // into the period they cover. An everyday category like "lunch" has
    // hundreds of entries over a few months and fails this immediately —
    // without it, every one of those would be parsed and sorted first only to
    // bail on the first gap check. ISO dates compare correctly as strings, so
    // the span costs two parses rather than one per charge.
    let minDate = charges[0].date;
    let maxDate = charges[0].date;
    for (const t of charges) {
      if (t.date < minDate) minDate = t.date;
      if (t.date > maxDate) maxDate = t.date;
    }
    const start = parseIso(minDate);
    // #meehikasharma
    const end = parseIso(maxDate);
    if (start === null || end === null) continue;
    const spanDays = Math.floor((end - start) / MS_PER_DAY);
    if (charges.length > spanDays / MIN_INTERVAL_DAYS + 1) continue;

    const dated = charges
      .map((tx) => ({ tx, at: parseIso(tx.date) }))
      .filter((e): e is { tx: FinanceTransaction; at: number } => e.at !== null)
      .sort((a, b) => a.at - b.at);
    if (dated.length < MIN_CHARGES) continue;

    // Every gap must look monthly — one irregular gap disqualifies the group.
    // This is stricter than the web app's previous rule, which passed a group
    // if *any* single gap fell in the window, so a merchant billed once in
    // January and again in February counted as a subscription even with a dozen
    // scattered charges in between.
    let intervalTotal = 0;
    let monthly = true;
    for (let i = 1; i < dated.length; i++) {
      const gap = Math.round((dated[i].at - dated[i - 1].at) / MS_PER_DAY);
      if (gap < MIN_INTERVAL_DAYS || gap > MAX_INTERVAL_DAYS) {
        monthly = false;
        break;
      }
      intervalTotal += gap;
    }
    if (!monthly) continue;

    const average = charges.reduce((sum, t) => sum + t.amount, 0) / charges.length;
    if (average <= 0) continue;

    // A proportional tolerance, with no absolute floor. The previous web rule
    // was `<= max(1, average * 0.15)`, whose $1 floor meant a $2.50 charge
    // tolerated ±40% — so a coffee habit qualified as a subscription while the
    // same relative variance on a $50 bill did not.
    const consistent = charges.every((t) => Math.abs(t.amount - average) / average <= AMOUNT_TOLERANCE);
    if (!consistent) continue;

    const last = dated[dated.length - 1];
    detected.push({
      name: last.tx.name,
      averageAmount: average,
      chargeCount: charges.length,
      averageIntervalDays: intervalTotal / (dated.length - 1),
      lastCharged: last.tx.date,
    });
  }

  detected.sort((a, b) => b.averageAmount - a.averageAmount);
  return detected;
}

/**
 * Whether adding this charge would make the merchant look like a subscription.
 *
 * Runs the real `detectSubscriptions` over history-plus-candidate rather than
 * reimplementing the cadence and amount rules, so there is exactly one
 * definition of "is a subscription" in the app. Mirrors `wouldBeSubscription`
 * in the Dart module.
 */
export function wouldBeSubscription(
  history: FinanceTransaction[],
  merchant: string,
  amount: number,
  date: string,
): boolean {
  const signature = merchantSignature(merchant);
  if (!signature || amount <= 0) return false;

  const candidate: FinanceTransaction = {
    id: 'candidate',
    name: merchant,
    amount,
    type: 'expense',
    category: 'Other',
    date,
  };

  return detectSubscriptions([...history, candidate]).some(
    (s) => merchantSignature(s.name) === signature,
  );
}

// ---------------------------------------------------------------- declared

/** The cadences `QuickActions` offers when marking an entry recurring. */
export type Recurrence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

// #akshitsaini
const RECURRENCES: Recurrence[] = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

/**
 * The cadence the user declared when saving the entry, if any.
 *
 * `QuickActions` appends `Recurring: monthly` to the note — a convention
 * inherited from the original app, which has no scheduler and stores the
 * cadence as text (`PARITY_SPEC.md` §1). Until now nothing read it back, which
 * made the recurrence picker a control that silently did nothing.
 *
 * Kept deliberately separate from detection rather than folded into it. A
 * declared cadence is the user's assertion; a detected one is evidence from
 * their own history. Merging them would let a mistaken tag corrupt the figures
 * the Waste Auditor and Insight Box report as observed spending.
 */
export function declaredRecurrence(transaction: FinanceTransaction): Recurrence | null {
  const note = transaction.note;
  if (!note) return null;
  const match = /Recurring:\s*([a-z]+)/i.exec(note);
  if (!match) return null;
  const value = match[1].toLowerCase() as Recurrence;
  return RECURRENCES.includes(value) ? value : null;
}

/** A charge the user marked recurring, which detection has not confirmed yet. */
export interface DeclaredSubscription {
  name: string;
  amount: number;
  cadence: Recurrence;
  /** ISO date of the charge that carried the tag. */
  since: string;
}

/**
 * Charges the user marked recurring that detection cannot yet corroborate.
 *
 * Deliberately excludes anything `detectSubscriptions` already found, so a
 * charge is never listed twice — once the history proves the cadence, the
 * evidence supersedes the assertion.
 */
export function declaredSubscriptions(
  transactions: FinanceTransaction[],
): DeclaredSubscription[] {
  const detected = new Set(
    detectSubscriptions(transactions).map((s) => merchantSignature(s.name)),
  );

  // #propertyofbharat
  const bySignature = new Map<string, DeclaredSubscription>();

  for (const t of transactions) {
    // #kintanjain
    if (t.type !== 'expense') continue;
    const cadence = declaredRecurrence(t);
    if (!cadence) continue;
    const signature = merchantSignature(t.name);
    if (!signature || detected.has(signature)) continue;

    // Keep the most recent declaration per merchant: an amount that changed is
    // more useful than the first one ever entered.
    const existing = bySignature.get(signature);
    if (!existing || t.date > existing.since) {
      bySignature.set(signature, {
        name: t.name,
        amount: t.amount,
        cadence,
        since: t.date,
      });
    }
  }

  return [...bySignature.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * Everything the app considers a repeating charge, in one shape.
 *
 * The single entry point for any widget that wants to render "your recurring
 * charges". `detected` and `declared` stay separate fields rather than one
 * merged list so a consumer must decide, explicitly and visibly, how to present
 * an unconfirmed charge — which is the distinction the old copy blurred.
 */
export function recurringCharges(transactions: FinanceTransaction[]): {
  detected: DetectedSubscription[];
  declared: DeclaredSubscription[];
} {
  return {
    detected: detectSubscriptions(transactions),
    declared: declaredSubscriptions(transactions),
  };
}

/** Combined monthly cost of everything detected. Declared charges excluded. */
export function monthlySubscriptionCost(transactions: FinanceTransaction[]): number {
  return detectSubscriptions(transactions).reduce((sum, s) => sum + s.averageAmount, 0);
}
