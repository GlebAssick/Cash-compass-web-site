import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, AlertCircle } from "lucide-react";
import { forgotPassword, ApiError } from "@/lib/apiClient";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
  Forgot-password screen. All copy goes through i18next (`auth.forgot.*`).
  Behaviour unchanged: the backend always answers with the same generic
  message whether or not the account exists (anti-enumeration), and the UI
  mirrors that honesty instead of promising a letter that may not come.
*/
const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t("auth.forgot.errorRequired"));
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.forgot.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.forgot.eyebrow")}
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("auth.forgot.sentText", { email })}
          </p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">
            {t("auth.forgot.backToLogin")}
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.forgot.emailLabel")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                autoComplete="email"
                placeholder={t("auth.forgot.emailPlaceholder")}
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {loading ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">
            {t("auth.forgot.backToLogin")}
          </Link>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;