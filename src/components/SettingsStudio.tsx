import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";
import { useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";
// #propertyofindia
import { useFinance } from "@/contexts/FinanceContext";
import { displayName, initials, useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restartAppTour } from "@/lib/tourState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// #athenanair
const STORAGE_KEY = "cash-compass-ui-settings-v1";

// The font-family pack went with the theme system: one design, one typeface.
// Text size stays — that is an accessibility control, not a style choice.
interface UiSettings {
  fontScale: number;
}

const defaultSettings: UiSettings = {
  fontScale: 100,
};

export const SettingsStudio = () => {
  const { currency, setCurrency, ratesLoading, ratesError, lastUpdated, refreshRates } = useCurrency();
  const { i18n, t } = useTranslation();
  const { resetAll } = useFinance();
  const auth = useAuth();
  const [settings, setSettings] = useState<UiSettings>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    try {
      const parsed = JSON.parse(raw) as Partial<UiSettings>;
      return {
        fontScale: Number.isFinite(parsed.fontScale) ? Math.min(120, Math.max(85, Number(parsed.fontScale))) : defaultSettings.fontScale,
      };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("font-size", `${settings.fontScale}%`);
  }, [settings]);

  // The detector can yield regional tags like "en-US"; the select only
  // knows the three base codes, so match on the language part.
  const language = (i18n.language ?? "en").split("-")[0];

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("settingsPage.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("settingsPage.subtitle")}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* ── Currency + Rates ── */}
          <div className="space-y-2">
            <Label>{t("settingsPage.currency")}</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="RUB">RUB (₽)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {ratesLoading && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> {t("settingsPage.updatingRates")}
                </span>
              )}
              {!ratesLoading && lastUpdated && (
                <span>{t("settingsPage.ratesUpdated", { time: lastUpdated.toLocaleTimeString() })}</span>
              )}
              {ratesError && (
                <Badge variant="secondary" className="text-xs">{ratesError}</Badge>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => refreshRates()}
              disabled={ratesLoading}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${ratesLoading ? "animate-spin" : ""}`} />
              {t("settingsPage.refreshRates")}
            </Button>
            {/* ── Language ── */}
            <div className="space-y-2 pt-2">
              <Label>{t("settings.language")}</Label>
              <Select value={language} onValueChange={(v) => i18n.changeLanguage(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("settingsPage.fontSize", { value: settings.fontScale })}</Label>
            <Slider
              value={[settings.fontScale]}
              min={85}
              max={120}
              step={1}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, fontScale: value[0] ?? 100 }))}
            />
          </div>
          {/* #vanshkapoor */}
          {/* ── App Tour ── */}
          <div className="space-y-2 rounded-2xl border border-border bg-secondary/20 p-4 md:col-span-2">
            <div>
              <Label>{t("settingsPage.appTour")}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{t("settingsPage.appTourDesc")}</p>
            </div>
            {/* #propertyofindia */}
            <Button type="button" variant="secondary" size="sm" onClick={restartAppTour}>{t("settingsPage.restartTour")}</Button>
          </div>
        </CardContent>
      </Card>
      {/* ── Account Section ── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("settingsPage.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
              {initials(auth.user)
                ? initials(auth.user)
                : auth.isDemoMode ? "DM" : "?"}
            </div>
            <div>
              <p className="text-sm font-medium">{displayName(auth.user) || (auth.isDemoMode ? t("settingsPage.demoMode") : t("settingsPage.notSignedIn"))}</p>
              <p className="text-xs text-muted-foreground">{auth.user?.email || (auth.isDemoMode ? t("settingsPage.demoRunning") : "")}</p>
              {auth.isDemoMode && (
                <Badge variant="secondary" className="mt-1 text-[10px]">{t("settingsPage.demoBadge")}</Badge>
              )}
            </div>
          </div>
          {(auth.isDemoMode || auth.user) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => auth.signOut()}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              {auth.isDemoMode ? t("settingsPage.leaveDemo") : t("settingsPage.signOut")}
            </Button>
          )}
        </CardContent>
      </Card>
      {/* #akshitsaini */}
      {/* ── Destructive Data Reset ── */}
      <Card className="rounded-2xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t("settingsPage.dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm" className="w-full">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {t("settingsPage.resetAll")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settingsPage.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settingsPage.confirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("settingsPage.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetAll();
                    // Also clear related localStorage keys
                    localStorage.removeItem("cash-compass-day-plans-v1");
                    localStorage.removeItem("cash-compass-budget-plans-v1");
                    localStorage.removeItem("cash-compass-budget-draft-v1");
                    localStorage.removeItem("cash-compass-student-planner-v1");
                    localStorage.removeItem("cash-compass-range-v1");
                    localStorage.removeItem("cash-compass-workspace-v3");
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("settingsPage.confirmDelete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("settingsPage.localNote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};