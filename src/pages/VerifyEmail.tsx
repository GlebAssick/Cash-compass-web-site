import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, ShieldCheck, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { verifyEmail, resendVerification, ApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
  Email confirmation screen. The backend issues a 6-digit code at registration
  and mails it; this page is where the code is entered. It was missing entirely
  (the endpoint and apiClient function existed with no route), so email users
  could never reach is_verified=1 — only OAuth users, who are verified at
  creation. The cabinet's "not verified" badge deep-links here with ?email=.
*/
const VerifyEmailPage = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || code.trim().length !== 6) {
      setError(t("verifyEmail.codeLength"));
      return;
    }
    setLoading(true);
    try {
        await verifyEmail(email.trim(), code.trim());
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("verifyEmail.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(t("verifyEmail.needEmail"));
      return;
    }
    setResending(true);
    try {
      await resendVerification(email.trim());
      setInfo(t("verifyEmail.resent"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("verifyEmail.failed"));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("verifyEmail.eyebrow")}
      title={t("verifyEmail.title")}
      subtitle={t("verifyEmail.subtitle")}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("verifyEmail.emailLabel")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("verifyEmail.codeLabel")}</Label>
          <div className="relative">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder={t("verifyEmail.codePlaceholder")}
              className="pl-10 tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground" role="status">{info}</div>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t("verifyEmail.submit")}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
          <RefreshCw className="h-4 w-4" />
          {resending ? "…" : t("verifyEmail.resend")}
        </Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">
          {t("verifyEmail.backToLogin")}
        </Link>
      </form>
    </AuthShell>
  );
};

export default VerifyEmailPage;