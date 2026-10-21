import { DashboardPlanner } from "@/components/DashboardPlanner";
import { GoalsInsights } from "@/components/GoalsInsights";
import { WorkspaceCanvas } from "@/components/WorkspaceCanvas";
import { SettingsStudio } from "@/components/SettingsStudio";
import { StudentPlannerHub } from "@/components/StudentPlannerHub";
import { EventCalendar } from "@/components/widgets/EventCalendar";
import { SubscriptionTracker } from "@/components/widgets/SubscriptionTracker";
import { SpendingPatternInsight } from "@/components/forms/ReasonTags";
import { TransactionFeed } from "@/components/TransactionFeed";
import { SavingsProgress } from "@/components/SavingsProgress";
import { AutoSaveRoad } from "@/components/AutoSaveRoad";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PersonalizedTipsCard } from "@/components/PersonalizedTipsCard";
import { PersonalCabinet } from "@/pages/PersonalCabinet";
import { useAuth, displayName, initials } from "@/context/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import { Wallet, Bell, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GreetingHeader } from "@/components/GreetingHeader";
import { ThemeToggle } from "@/components/ThemeToggle";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AUTO_SAVE_TARGET_USD = 220;
const AUTO_SAVE_PROGRESS = 0.68;

const SoftWidget = ({
  title,
  children,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    className={`rounded-2xl border border-border bg-card/80 p-3 shadow-card ${
      onClick ? "cursor-pointer transition-colors hover:bg-accent" : ""
    }`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
    {children}
  </div>
);

export const SoftBloomLayout = () => {
  const { formatFromUSD, convertToUSD, convertFromUSD } = useCurrency();
  const { manualBalance, setManualSnapshot } = useFinance();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    "Dashboard" | "Goals" | "Planner" | "Workspace" | "Location" | "Cabinet" | "Settings"
  >("Dashboard");
  const navItems: Array<{
    key: "Dashboard" | "Goals" | "Planner" | "Workspace" | "Location" | "Settings";
    label: string;
  }> = [
    { key: "Dashboard", label: t("nav.dashboard") },
    { key: "Goals", label: t("nav.goals") },
    { key: "Planner", label: t("nav.planner") },
    { key: "Workspace", label: t("nav.workspace") },
    { key: "Location", label: t("nav.location") },
    { key: "Settings", label: t("nav.settings") },
  ];

  const updateSnapshot = (value: number) => {
    setManualSnapshot({
      balance: convertToUSD(value),
      incomeToDate: null,
      spentToday: null,
    });
  };

  const [balanceInput, setBalanceInput] = useState<string>(
    manualBalance === null ? "" : String(convertFromUSD(manualBalance)),
  );

  useEffect(() => {
    setBalanceInput(manualBalance === null ? "" : String(convertFromUSD(manualBalance)));
  }, [manualBalance, convertFromUSD]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultEndIso = new Date(Date.now() + 7 * MS_PER_DAY).toISOString().slice(0, 10);
  const RANGE_KEY = "cash-compass-range-v1";
  const readSavedRange = () => {
    try {
      const raw = localStorage.getItem(RANGE_KEY);
      if (!raw) return { start: todayIso, end: defaultEndIso };
      const parsed = JSON.parse(raw);
      if (parsed?.start && parsed?.end) return { start: parsed.start, end: parsed.end };
      return { start: todayIso, end: defaultEndIso };
    } catch {
      return { start: todayIso, end: defaultEndIso };
    }
  };
  const saved = readSavedRange();
  const [startIso, setStartIso] = useState<string>(saved.start);
  const [endIso, setEndIso] = useState<string>(saved.end);

  const formatIsoToDisplay = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const parseToIso = (value: string): string | null => {
    const v = value.trim();
    if (!v) return null;
    const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return v;
    }
    const dm = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (dm) {
      const day = Number(dm[1]);
      const month = Number(dm[2]);
      let year = Number(dm[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
      const js = new Date(year, month - 1, day);
      if (js && js.getFullYear() === year && js.getMonth() === month - 1 && js.getDate() === day) {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
      }
    }
    return null;
  };

  const [startInput, setStartInput] = useState<string>(formatIsoToDisplay(startIso));
  const [endInput, setEndInput] = useState<string>(formatIsoToDisplay(endIso));

  useEffect(() => setStartInput(formatIsoToDisplay(startIso)), [startIso]);
  useEffect(() => setEndInput(formatIsoToDisplay(endIso)), [endIso]);
  useEffect(() => {
    try {
      localStorage.setItem(RANGE_KEY, JSON.stringify({ start: startIso, end: endIso }));
    } catch {
      return;
    }
  }, [startIso, endIso]);

  const days = useMemo(() => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const diff = Math.ceil((e.getTime() - s.getTime()) / MS_PER_DAY);
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, [startIso, endIso]);

  const dailyBudgetUSD = manualBalance !== null ? manualBalance / days : null;

   return (
    <>
      <ThemeToggle />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-secondary/30 p-6 lg:flex lg:flex-col lg:gap-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg">cash-compass</span>
          </div>
          <nav className="space-y-1 mt-4 font-body text-sm">
            {navItems.map((item) => (
              <div
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </div>
            ))}
          </nav>
          <div className="space-y-3">
                        <NotificationCenter />
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("Cabinet")}
            className={`mt-auto flex items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-accent ${
              activeTab === "Cabinet" ? "bg-accent" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user) ?? "?"}
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-heading font-medium text-foreground">
                {displayName(user) ?? t("sidebar.yourAccount")}
              </p>
              <p className="italic">cash-compass</p>
            </div>
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 max-w-5xl space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pr-14 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/80 text-muted-foreground border border-border"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <GreetingHeader />
          {activeTab === "Dashboard" && (
            <section
              data-tour="balance-summary"
              className="grid grid-cols-1 sm:grid-cols-4 gap-4 rounded-3xl border border-border bg-card/90 p-4 shadow-card items-end"
            >
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboardHeader.totalBalance")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  onBlur={() => {
                    if (balanceInput === "") {
                      setManualSnapshot({ balance: null, incomeToDate: null, spentToday: null });
                      return;
                    }
                    const parsed = Number(balanceInput || 0);
                    updateSnapshot(Math.max(0, parsed || 0));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboardHeader.startDate")}
                </Label>
                <Input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseToIso(startInput);
                    if (parsed) setStartIso(parsed);
                    else setStartInput(formatIsoToDisplay(startIso));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboardHeader.endDate")}
                </Label>
                <Input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseToIso(endInput);
                    if (parsed) setEndIso(parsed);
                    else setEndInput(formatIsoToDisplay(endIso));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboardHeader.dailyBudget")}
                </Label>
                <div className="text-sm font-medium">
                  {dailyBudgetUSD === null ? "—" : formatFromUSD(dailyBudgetUSD)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("dashboardHeader.spreadOver", { count: days })}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-secondary/30 p-3 sm:col-span-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("dashboardHeader.snapshotTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboardHeader.snapshotSubtitle")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (balanceInput === "") {
                      setManualSnapshot({ balance: null, incomeToDate: null, spentToday: null });
                      return;
                    }
                    const parsed = Number(balanceInput || 0);
                    updateSnapshot(Math.max(0, parsed || 0));
                  }}
                >
                  {t("dashboardHeader.save", "Save")}
                </Button>
              </div>
            </section>
          )}
          {activeTab === "Dashboard" && (
            <>
              <DashboardPlanner section="stats" />
              <AutoSaveRoad
                saved={AUTO_SAVE_TARGET_USD * AUTO_SAVE_PROGRESS}
                target={AUTO_SAVE_TARGET_USD}
                formatValue={(value) => formatFromUSD(value, { maximumFractionDigits: 0 })}
              />
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <EventCalendar />
                <SubscriptionTracker />
              </section>
              <SpendingPatternInsight />
              <SavingsProgress />
              <TransactionFeed />
              <PersonalizedTipsCard />
            </>
          )}
          {activeTab === "Goals" && <GoalsInsights />}
          {activeTab === "Planner" && (
            <>
              <DashboardPlanner section="planner" />
              <StudentPlannerHub />
            </>
          )}
          {activeTab === "Workspace" && <WorkspaceCanvas />}
          {activeTab === "Settings" && <SettingsStudio />}
          {activeTab === "Location" && <DashboardPlanner section="location" />}
          {activeTab === "Cabinet" && <PersonalCabinet />}
        </main>
      </div>
    </>
  );
};