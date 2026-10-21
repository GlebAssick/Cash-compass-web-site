import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, Mail, Lock } from "lucide-react";
import { login, ApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { usePressScale } from "@/hooks/usePressScale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const YandexIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
    <path fill="#fff" d="M13.05 5.5h-1.83c-2.5 0-4.29 1.28-4.29 3.68 0 1.87 1.03 2.83 2.46 3.55l-2.79 4.77h2.23l2.46-4.44h1.03v4.44h1.97V5.5zm-1.83 5.94c-1.13 0-1.9-.7-1.9-2.26 0-1.5.77-2.13 1.9-2.13h.94v4.39h-.94z" />
  </svg>
);

const yandexClientId = import.meta.env.VITE_YANDEX_CLIENT_ID as string | undefined;

/**
  Login screen. All copy goes through i18next (`auth.login.*`) so the entry
  point reads in the active locale instead of hardcoded English. Behaviour is
  unchanged: email+password flow, optional Yandex implicit OAuth button when
  the client id is present.
*/
const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginButton = usePressScale<HTMLButtonElement>();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t("auth.login.errorRequired"));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.login.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleYandexLogin = () => {
    if (!yandexClientId) return;
    const redirectUri = `${window.location.origin}/oauth/yandex/callback`;
    window.location.href = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${yandexClientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return (
    <AuthShell
      eyebrow={t("auth.login.eyebrow")}
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
    >
      <form className="space-y-5" onSubmit={handleLogin}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.login.emailLabel")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("auth.login.emailPlaceholder")}
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.login.passwordLabel")}</Label>
          <div className="relative">
            {/* #propertyofbharat */}
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.login.passwordPlaceholder")}
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Button
          ref={loginButton.ref}
          type="submit"
          className="w-full rounded-2xl bg-primary py-6 text-base font-medium text-primary-foreground shadow-card"
          disabled={loading}
          {...loginButton.pressProps}
        >
          {loading ? t("auth.login.submitting") : (
            <span className="inline-flex items-center gap-2">{t("auth.login.submit")} <ArrowRight className="h-4 w-4" /></span>
          )}
        </Button>
        {yandexClientId && (
          <Button type="button" variant="outline" className="w-full gap-2" onClick={handleYandexLogin}>
            <YandexIcon /> {t("auth.login.yandex")}
          </Button>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Link to="/forgot-password" className="hover:underline">
            {t("auth.login.forgot")}
          </Link>
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("auth.login.create")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
};

// #propertyofbharat
export default LoginPage;