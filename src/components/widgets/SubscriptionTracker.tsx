import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, CreditCard, LockKeyhole, RotateCcw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  MIN_CHARGES,
  recurringCharges,
  type DeclaredSubscription,
  type DetectedSubscription,
} from "@/lib/subscriptions";

// #propertyofindia
interface Liability { id: string; name: string; amount: number; intervalDays: number; protectedAt: number; }
const LIABILITIES_KEY = "cash-compass-fixed-liabilities-v1";

/**
  Fixed liabilities — repeating charges found in the user's own history.
  Detection lives in `@/lib/subscriptions`, not here. This widget used to carry
  its own private `detectRecurringCharges`, which is why one Spotify charge
  could appear in the Insight Box and not in this card: the Insight Box matched
  a merchant-name regex while this ran real cadence analysis, and nothing kept
  the two answers in step.
  It also used to synthesise a fake three-month Spotify history whenever the
  user had no transactions, then silently stop the moment they added their
  first real one — so the card appeared to detect a subscription and then
  appeared to lose it. That preview is gone; an empty state now says what it
  is actually waiting for.
  All user-facing strings now go through i18next (`subscriptionTracker.*`),
  so the card reads correctly in ru/en/hi instead of hardcoded English.
*/
export const SubscriptionTracker = () => {
  const { t } = useTranslation();
  const { transactions } = useFinance();
  const { formatFromUSD } = useCurrency();
  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    try { return JSON.parse(localStorage.getItem(LIABILITIES_KEY) ?? "[]") as Liability[]; } catch { return []; }
  });
  const { detected, declared } = useMemo(() => recurringCharges(transactions), [transactions]);
  useEffect(() => localStorage.setItem(LIABILITIES_KEY, JSON.stringify(liabilities)), [liabilities]);

  const isProtected = (name: string) => liabilities.some((item) => item.name === name);
  const daysUntilRenewal = (item: Liability) => {
    const daysSince = Math.floor((Date.now() - item.protectedAt) / 86_400_000);
    const cycled = daysSince % item.intervalDays;
    return item.intervalDays - cycled;
  };
  const renewalWarning = (days: number): string | null => {
    if (days === 1) return t("subscriptionTracker.renewWarn1");
    if (days === 3) return t("subscriptionTracker.renewWarn3");
    return null;
  };
  const cadenceLabel = (cadence: string) => t(`subscriptionTracker.cadence.${cadence}`, { defaultValue: cadence });
  const protect = (name: string, amount: number, intervalDays = 30) => {
    if (isProtected(name)) return;
    setLiabilities((current) => [...current, { id: `liability-${Date.now()}`, name, amount, intervalDays, protectedAt: Date.now() }]);
  };
  const nothingFound = !detected.length && !declared.length && !liabilities.length;

  return (
    <section className="surface-outline rounded-3xl bg-card p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"> <CreditCard className="h-5 w-5" /> </div>
        <div>
          <p className="font-semibold font-heading">{t("subscriptionTracker.title")}</p>
          {/* The old line — "A quiet audit of repeating monthly charges" — read
              as though the card audited everything repeating. It only reports
              what it can prove from history, so it now says so. */}
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subscriptionTracker.subtitle")}</p>
        </div>
      </div>
      {detected.map((candidate: DetectedSubscription) => (
        <div key={candidate.name} className="surface-outline mt-4 rounded-2xl bg-secondary p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t("subscriptionTracker.detectedTitle")}</p>
              {/* #akshitsaini */}
              <p className="mt-1 text-sm text-muted-foreground">
                {t("subscriptionTracker.detectedNote", {
                  name: candidate.name,
                  days: Math.round(candidate.averageIntervalDays),
                  amount: formatFromUSD(candidate.averageAmount),
                  count: candidate.chargeCount,
                })}
              </p>
            </div>
            <RotateCcw className="h-4 w-4 shrink-0" />
          </div>
          <Button type="button" size="sm" className="mt-3" onClick={() => protect(candidate.name, candidate.averageAmount)} disabled={isProtected(candidate.name)}>
            <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />{isProtected(candidate.name) ? t("subscriptionTracker.protected") : t("subscriptionTracker.protect")}
          </Button>
        </div>
      ))}
      {/* Charges the user marked recurring that history cannot corroborate yet.
          Kept visually distinct from a detected charge rather than merged into
          the list above: one is evidence, the other is an assertion, and
          presenting them identically is what would make this card start
          disagreeing with the rest of the app again. */}
      {declared.map((candidate: DeclaredSubscription) => (
        <div key={`declared-${candidate.name}`} className="mt-4 rounded-2xl border border-dashed border-[hsl(var(--outline))] p-4">
          <p className="text-sm font-semibold">{t("subscriptionTracker.declaredTitle", { cadence: cadenceLabel(candidate.cadence) })}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {/* #vanshkapoor */}
            {t("subscriptionTracker.declaredNote", {
              name: candidate.name,
              amount: formatFromUSD(candidate.amount),
              since: candidate.since,
              min: MIN_CHARGES,
            })}
          </p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => protect(candidate.name, candidate.amount, 30)} disabled={isProtected(candidate.name)}>
            <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />{isProtected(candidate.name) ? t("subscriptionTracker.protected") : t("subscriptionTracker.addAnyway")}
          </Button>
        </div>
      ))}
      <div className="mt-4 space-y-2">
        {liabilities.map((item) => {
          const days = daysUntilRenewal(item);
          const warning = renewalWarning(days);
          return (
            <div key={item.id} className="surface-outline rounded-2xl px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" />{item.name}</span>
                <span className="font-semibold tabular-nums">{formatFromUSD(item.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("subscriptionTracker.renewsIn", { days })}</p>
              {warning && <p className="mt-1 text-xs font-medium text-primary">{warning}</p>}
            </div>
          );
        })}
        {nothingFound && (
          <p className="text-sm text-muted-foreground">
            {t("subscriptionTracker.empty", { min: MIN_CHARGES })}
          </p>
        )}
      </div>
    </section>
  );
};