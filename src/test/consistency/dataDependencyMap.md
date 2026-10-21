# Data dependency map

Which widgets are supposed to reflect which concepts, and where the one true
answer for each concept lives.

**When you add a widget that displays any concept below, add it to that row.**
That is the whole point of this file. Every bug this suite exists to catch had
the same shape: a second consumer appeared, computed the concept itself, and
nobody noticed the two answers had diverged until a user saw one number in one
place and a different number in another.

The suite in this directory is a *relational* check — "does every consumer show
the same answer" — and is deliberately separate from the rendering tests in
`src/test/`, which ask "does this draw without breaking". Both run
independently; neither replaces the other.

---

## Concepts

| Concept | Canonical source | Consumers | Status |
| --- | --- | --- | --- |
| **Recurring charge / subscription** | `detectSubscriptions` — `src/lib/subscriptions.ts` | Fixed Liabilities (`widgets/SubscriptionTracker`), Insight Box subscription audit (`InsightBox`), Workspace Waste Auditor (`WorkspaceCanvas`) | ✅ all three read it |
| **Declared recurrence** | `declaredSubscriptions` — `src/lib/subscriptions.ts` | Fixed Liabilities only, by design | ✅ |
| **Available balance** | `availableBalance` — `FinanceContext` | Balance Overview (`BalanceOverview`) | ✅ reads it |
| **Spent today / total spent** | `spentToday`, `totalSpent` — `FinanceContext` | Balance Overview, Workspace Today Snapshot, Dashboard Planner | 🟡 see below |
| **Category spend (all-time)** | `expensesByCategory` — `FinanceContext` | Spending Pattern donut, Workspace Top Categories | ✅ |
| **Category spend (this month)** | `expensesByCategoryInMonth` — `src/lib/budgets.ts` | anything divided by a `monthlyLimit` | ✅ |
| **Budget percentage-used** | `budgetUsage` — `src/lib/budgets.ts` | Insight Box 80% alert, Workspace Budget Health | ✅ both read it |
| **Goal progress** | `goalPercent` / `goalFraction` — `src/lib/goals.ts` | Goals tab (`GoalsInsights`), Quick Actions goal list, `SavingsProgress`, Workspace Goal Progress, Workspace Sub-Stash Jar | ✅ all five read it |
| **Planner fixed costs (manual)** | Planner component state — `StudentPlannerHub` | Survival Calculator only | ✅ not shared |

---

## What this pass found

Four divergences, only one of which had been reported.

**1. Recurring charges — four definitions.** The reported symptom. One $3
Spotify charge appeared in the Insight Box and not in Fixed Liabilities because
the Insight Box matched a hardcoded merchant regex
(`/netflix|spotify|subscription|prime|youtube/i`) that fires on a single
transaction, while Fixed Liabilities ran real cadence analysis needing two
charges a month apart. The Workspace Waste Auditor rendered a **literal array**
— Streaming $15.99, Cloud Storage $9.99, Gym $49.99 — and read no user data at
all. And `QuickActions` wrote `Recurring: monthly` into the transaction note,
which nothing ever read back, so the recurrence picker did nothing.

Fixed Liabilities also **synthesised a fake three-month Spotify history**
whenever the user had no transactions, then stopped the moment they added their
first real one — so the card appeared to detect a subscription and then appeared
to lose it. That is the likeliest reason this read as a regression rather than a
threshold.

**2. Budget percentage-used — two scopes.** The Insight Box scoped spend to the
current month; the Workspace Budget Health widget divided **all-time** category
spend by the same *monthly* limit. Six months into a $400/month grocery budget,
one said 95% and the other said 500%.

**3. Goal progress — five copies, two conventions.** Four call sites wrapped
`current / target` in `Math.min(100, …)`; `SavingsProgress` did not. An
over-funded goal read 100% in four places and 150% in the fifth. None guarded
`target === 0`. The workspace portfolio average also averaged *unclamped*
percentages, so one goal at 300% dragged the whole average up.

**4. Available balance — the original bug, still on screen.** `FinanceContext`
had been corrected to `max(0, manualBalance + totalIncome - totalSpent)`, but
`BalanceOverview` kept its own inline copy of the *pre-fix* formula, which omits
income. The canonical value had **zero readers**. So the balance fix was never
actually delivered: recording a salary still changed nothing on the headline
card while recording a coffee did.

---

## Known remaining item

🟡 **Spent today / total spent.** `BalanceOverview` now reads both from the
context. `WorkspaceCanvas` still derives `spentTodayFromEntries` locally and
`DashboardPlanner` derives `spentToDate` locally. Both currently agree with the
context arithmetically, so there is no visible symptom — but they are two more
copies of a shared derivation, which is exactly the precondition for the next
one of these. Route them through the context when either file is next touched.

---

## Rules

1. **One concept, one function.** If two components need the same number, it
   goes in `src/lib/` or the context, not in both components.
2. **Assert agreement, not constants.** Consistency tests compare a consumer's
   output to the canonical function's output. A test that hardcodes "should say
   3 charges" keeps passing when a threshold is deliberately changed and the
   consumers drift apart underneath it.
3. **Scope belongs in the name.** `expensesByCategory` and
   `expensesByCategoryInMonth` are both legitimate and are not interchangeable.
   Naming one of them just "the category totals" is how #2 happened.
4. **Clamping is a display decision.** Canonical functions return the true
   value — `budgetUsage.ratio` can exceed 1, `goalFraction` can exceed 1 — and
   the clamp lives in exactly one display helper.
5. **Never render invented data.** A widget with nothing to show says so. A
   fabricated preview that disappears on first real input is indistinguishable
   from a bug.

## Consumers asserted directly rather than rendered

`WorkspaceCanvas` widgets (Waste Auditor, Budget Health, Goal Progress,
Sub-Stash Jar) live inside a dnd-kit canvas and cannot be mounted in isolation,
so rendering them would exercise the drag context rather than the arithmetic.
They are held to the canonical source by reading it — verified by grep in this
map and by the mutation check below — while the assertions run against the
canonical functions directly.

## Verifying the suite still has teeth

These tests were written after the fixes, so they were checked by
reintroducing each bug and confirming a failure:

| Reintroduced | Tests that failed |
| --- | --- |
| Income omitted from the balance formula | 3 |
| `goalPercent` un-clamped | 1 |
| Budget usage back to all-time scope | 2 |
| Insight Box merchant regex | 8 |

Do this again after any significant change to `src/lib/subscriptions.ts`,
`budgets.ts`, or `goals.ts`. A consistency suite that cannot fail is worse than
none, because it reads as proof.
