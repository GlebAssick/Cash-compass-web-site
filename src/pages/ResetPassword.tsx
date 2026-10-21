import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { resetPassword, ApiError } from "@/lib/apiClient";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
  Reset-password screen reached from the emailed link (?token=...). All copy
  goes through i18next (`auth.reset.*`). Behaviour unchanged: missing/expired
  token shows the invalid-link shell with a pointer back to /forgot-password;
  success redirects to login after a short pause.
*/
const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("auth.reset.invalidToken"));
    }
  }, [token, t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!token) return;
    if (newPassword.length < 8) {
      setError(t("auth.reset.errorShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.reset.errorMismatch"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.reset.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow={t("auth.reset.eyebrowError")}
        title={t("auth.reset.titleInvalid")}
        subtitle={t("auth.reset.subtitleInvalid")}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || t("auth.reset.missingToken")}
          </div>
          <Link to="/forgot-password" className="block text-center text-sm text-primary hover:underline">
            {t("auth.reset.requestNew")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={t("auth.reset.eyebrow")}
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.subtitle")}
    >
      {success ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">{t("auth.reset.successText")}</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            {t("auth.reset.goLogin")}
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.reset.newLabel")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.reset.newPlaceholder")}
                className="pl-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.reset.confirmLabel")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.reset.confirmPlaceholder")}
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.reset.submitting") : t("auth.reset.submit")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">
            {t("auth.reset.backToLogin")}
          </Link>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPasswordPage;