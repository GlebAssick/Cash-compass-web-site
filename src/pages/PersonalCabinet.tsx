import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, displayName, initials } from "@/context/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Mail,
  Globe,
  TrendingUp,
  TrendingDown,
  Flame,
  Award,
  Target,
  Wallet,
  Calendar,
  Sparkles,
  Languages,
  BadgeCheck,
  Trash2,
} from "lucide-react";

interface AchievementDef {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  icon: React.ReactNode;
}

interface SocialPlan {
  id: string;
  title: string;
  date: string;
  lowEstimate: number;
  realisticEstimate: number;
  stretchEstimate: number;
  splitCount: number;
  note?: string;
}

/** Same key the planner migrates legacy social plans into (3.1 → 6.1). */
const SOCIAL_PLANS_KEY = "cash-compass-social-plans-v1";

const LANGUAGE_OPTIONS = [
  { code: "ru", labelKey: "cabinet.langRu" },
  { code: "en", labelKey: "cabinet.langEn" },
  { code: "hi", labelKey: "cabinet.langHi" },
] as const;

export const PersonalCabinet = () => {
  const { user } = useAuth();
  const { formatFromUSD, convertToUSD } = useCurrency();
  const { t, i18n } = useTranslation();
  const { transactions, goals, budgets, totalIncome, totalSpent, availableBalance } = useFinance();
  const name = displayName(user);
  const userInitials = initials(user);
  const email = user?.email ?? null;
  // Optional fields that may or may not exist on the backend user shape —
  // accessed defensively so this page never breaks if they're absent.
  const country = (user as { country?: string } | null)?.country ?? null;
  const isVerified = (user as { is_verified?: number | boolean } | null)?.is_verified;
  const netSaved = totalIncome - totalSpent;

  const [socialPlans, setSocialPlans] = useState<SocialPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem(SOCIAL_PLANS_KEY) ?? "[]") as SocialPlan[]; } catch { return []; }
  });
  useEffect(() => localStorage.setItem(SOCIAL_PLANS_KEY, JSON.stringify(socialPlans)), [socialPlans]);

  const [spTitle, setSpTitle] = useState("");
  const [spDate, setSpDate] = useState("");
  const [spLow, setSpLow] = useState("");
  const [spRealistic, setSpRealistic] = useState("");
  const [spStretch, setSpStretch] = useState("");
  const [spSplit, setSpSplit] = useState("1");
  const [spNote, setSpNote] = useState("");

  const addSocialPlan = () => {
    const realisticEstimate = convertToUSD(Number(spRealistic));
    const lowEstimate = convertToUSD(Number(spLow));
    const stretchEstimate = convertToUSD(Number(spStretch));
    const splitCount = Math.max(1, Number(spSplit) || 1);
    if (!spTitle.trim() || !Number.isFinite(realisticEstimate) || realisticEstimate <= 0) {
      toast({ title: t("planner.almostThere"), description: t("planner.socialInvalid") });
      return;
    }
    setSocialPlans((prev) => [
      {
        id: `social-${Date.now()}`,
        title: spTitle.trim(),
        date: spDate || new Date().toISOString().slice(0, 10),
        lowEstimate: Number.isFinite(lowEstimate) && lowEstimate > 0 ? lowEstimate : realisticEstimate,
        realisticEstimate,
        stretchEstimate: Number.isFinite(stretchEstimate) ? Math.max(realisticEstimate, stretchEstimate) : realisticEstimate,
        splitCount,
        note: spNote.trim() || undefined,
      },
      ...prev,
    ]);
    setSpTitle("");
    setSpLow("");
    setSpRealistic("");
    setSpStretch("");
    setSpSplit("1");
    setSpNote("");
  };

  const removeSocialPlan = (id: string) => setSocialPlans((prev) => prev.filter((p) => p.id !== id));

  const totalSocialShare = useMemo(
    () => socialPlans.reduce((sum, plan) => sum + plan.realisticEstimate / Math.max(1, plan.splitCount), 0),
    [socialPlans],
  );

  const streakDays = useMemo(() => {
    const uniqueDates = Array.from(new Set(transactions.map((tx) => tx.date))).sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) return 0;
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const iso = cursor.toISOString().slice(0, 10);
      if (uniqueDates.includes(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [transactions]);

  const achievements: AchievementDef[] = useMemo(
    () => [
      {
        id: "first-step",
        label: t("cabinet.achievementList.firstStepLabel"),
        description: t("cabinet.achievementList.firstStepDesc"),
        achieved: transactions.length > 0,
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        // 6.3: reflects the backend is_verified flag (email/OAuth-confirmed).
        id: "verified-user",
        label: t("cabinet.achievementList.verifiedLabel"),
        description: t("cabinet.achievementList.verifiedDesc"),
        achieved: Boolean(isVerified),
        icon: <BadgeCheck className="h-4 w-4" />,
      },
      {
        id: "consistent-tracker",
        label: t("cabinet.achievementList.consistentLabel"),
        description: t("cabinet.achievementList.consistentDesc"),
        achieved: streakDays >= 3,
        icon: <Flame className="h-4 w-4" />,
      },
      {
        id: "century-club",
        label: t("cabinet.achievementList.centuryLabel"),
        description: t("cabinet.achievementList.centuryDesc"),
        achieved: totalSpent >= 100,
        icon: <TrendingDown className="h-4 w-4" />,
      },
      {
        id: "positive-saver",
        label: t("cabinet.achievementList.positiveLabel"),
        description: t("cabinet.achievementList.positiveDesc"),
        achieved: netSaved > 0,
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        id: "budget-builder",
        label: t("cabinet.achievementList.budgetLabel"),
        description: t("cabinet.achievementList.budgetDesc"),
        achieved: budgets.length > 0,
        icon: <Wallet className="h-4 w-4" />,
      },
      {
        id: "goal-setter",
        label: t("cabinet.achievementList.goalLabel"),
        description: t("cabinet.achievementList.goalDesc"),
        achieved: goals.length > 0,
        icon: <Target className="h-4 w-4" />,
      },
    ],
    [t, transactions.length, streakDays, totalSpent, netSaved, budgets.length, goals.length, isVerified],
  );
  const unlockedCount = achievements.filter((a) => a.achieved).length;

  const recentActivity = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (b.createdAt ?? b.date).localeCompare(a.createdAt ?? a.date))
        .slice(0, 10),
    [transactions],
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {userInitials ?? "?"}
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold">{name ?? t("cabinet.unnamedUser")}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {email}
                </span>
              )}
              {country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> {country}
                </span>
              )}
              {typeof isVerified !== "undefined" &&
                (isVerified ? (
                  <Badge variant="default">{t("cabinet.verified")}</Badge>
                ) : (
                  <Link to={`/verify-email?email=${encodeURIComponent(email ?? "")}`}>
                    <Badge variant="secondary" className="cursor-pointer underline-offset-4 hover:underline">
                      {t("cabinet.notVerified")}
                    </Badge>
                  </Link>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface language lives here, per product decision: the calendar's
          region toggle only filters events, it never switches the locale. */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="h-4 w-4 text-primary" /> {t("cabinet.languageTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("cabinet.languageSubtitle")}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((option) => (
            <Button
              key={option.code}
              type="button"
              variant={i18n.language?.startsWith(option.code) ? "default" : "outline"}
              size="sm"
              onClick={() => i18n.changeLanguage(option.code)}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* 6.1: social plans moved here from the planner (3.1). */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("planner.socialTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("planner.socialDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input placeholder={t("planner.planTitle")} value={spTitle} onChange={(e) => setSpTitle(e.target.value)} />
            <Input type="date" value={spDate} onChange={(e) => setSpDate(e.target.value)} />
            <Input type="number" placeholder={t("planner.low")} value={spLow} onChange={(e) => setSpLow(e.target.value)} />
            <Input type="number" placeholder={t("planner.realistic")} value={spRealistic} onChange={(e) => setSpRealistic(e.target.value)} />
            <Input type="number" placeholder={t("planner.stretch")} value={spStretch} onChange={(e) => setSpStretch(e.target.value)} />
            <Input type="number" min="1" placeholder={t("planner.splitCount")} value={spSplit} onChange={(e) => setSpSplit(e.target.value)} />
          </div>
          <Textarea placeholder={t("planner.socialNote")} value={spNote} onChange={(e) => setSpNote(e.target.value)} />
          <Button type="button" onClick={addSocialPlan} className="w-full">{t("planner.addSocialPlan")}</Button>
          <div className="space-y-2">
            {socialPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{plan.title}</p>
                    <Badge variant="secondary">{plan.date}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeSocialPlan(plan.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("planner.yourShare", { amount: formatFromUSD(plan.realisticEstimate / Math.max(1, plan.splitCount)) })}
                </p>
              </div>
            ))}
            {socialPlans.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("cabinet.socialEmpty")}</p>
            )}
          </div>
          {socialPlans.length > 0 && (
            <p className="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
              {t("cabinet.socialTotalShare", { amount: formatFromUSD(totalSocialShare) })}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("cabinet.availableBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatFromUSD(availableBalance)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("cabinet.netSaved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${netSaved >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatFromUSD(netSaved)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("cabinet.trackingStreak")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-xl font-semibold">
              <Flame className="h-4 w-4 text-primary" /> {streakDays}d
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{t("cabinet.achievements")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1.5 text-xl font-semibold">
              <Award className="h-4 w-4 text-primary" /> {unlockedCount}/{achievements.length}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("cabinet.achievements")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("cabinet.achievementsSubtitle")}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                a.achieved ? "border-primary/40 bg-primary/5" : "border-border opacity-60"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  a.achieved ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {a.icon}
              </div>
              <div>
                <p className="font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("cabinet.recentActivity")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("cabinet.recentActivitySubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span>{tx.icon ?? "💸"}</span>
                <div>
                  <p className="font-medium">{tx.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {tx.date} · {tx.category}
                  </p>
                </div>
              </div>
              <span className={`font-medium ${tx.type === "income" ? "text-emerald-600" : "text-foreground"}`}>
                {tx.type === "income" ? "+" : "-"}
                {formatFromUSD(tx.amount)}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("cabinet.noActivity")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalCabinet;