import { useEffect, useMemo, useState } from "react";
// #propertyofbharat
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowRight, Mail, Lock, User, Check, X, Globe } from "lucide-react";
import { register, ApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { CompassRose } from "@/components/CompassRose";
import { usePressScale } from "@/hooks/usePressScale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const passwordRules = [
  { key: "length", labelKey: "auth.signup.ruleLength", test: (pw: string) => pw.length >= 8 },
  { key: "upper", labelKey: "auth.signup.ruleUpper", test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "digit", labelKey: "auth.signup.ruleDigit", test: (pw: string) => /\d/.test(pw) },
];

/**
Countries offered at registration. The code is stored on the user profile
and mirrored to localStorage under `cash-compass-country`: the upcoming
compass-onboarding animation reads the needle angle from exactly this
value, so adding a country here is the only place the list lives.
*/
const COUNTRIES = [
  { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "IN", flag: "🇮🇳", name: "India" },
] as const;

const COUNTRY_STORAGE_KEY = "cash-compass-country";

/** Mini drawn flags for the select: emoji flags collapse to letter pairs on Windows. */
const FlagMini = ({ code }: { code: "RU" | "IN" }) => (
  <svg viewBox="0 0 12 8" className="mr-2 inline-block h-3 w-4 rounded-[2px]" aria-hidden="true">
    {code === "RU" ? (
      <>
        <rect width="12" height="2.67" y="0" fill="#FFFFFF" />
        <rect width="12" height="2.67" y="2.67" fill="#0039A6" />
        <rect width="12" height="2.66" y="5.34" fill="#D52B1E" />
      </>
    ) : (
      <>
        <rect width="12" height="2.67" y="0" fill="#FF9933" />
        <rect width="12" height="2.67" y="2.67" fill="#FFFFFF" />
        <rect width="12" height="2.66" y="5.34" fill="#138808" />
        <circle cx="6" cy="4" r="1.1" fill="none" stroke="#000080" strokeWidth="0.4" />
      </>
    )}
  </svg>
);

const readSavedCountry = (): string => {
  try {
    const raw = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (raw && COUNTRIES.some((country) => country.code === raw)) return raw;
  } catch {
    // Ignore localStorage failures in restrictive environments.
  }
  return "RU";
};

/**
  Signup screen. All copy goes through i18next (`auth.signup.*`). Behaviour is
  unchanged: validation rules, country persistence for the compass, and the
  hand-off to the backend register endpoint.
*/
const SignupPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isDemoMode } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [country, setCountry] = useState<string>(readSavedCountry);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const signupButton = usePressScale<HTMLButtonElement>();

  useEffect(() => {
    if (user || isDemoMode) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isDemoMode, navigate]);

  const emailValid = emailPattern.test(email.trim());
  const passwordChecks = useMemo(
    () => passwordRules.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );
  const passwordValid = passwordChecks.every((rule) => rule.passed);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setEmailTouched(true);
    setConfirmTouched(true);
    if (!name.trim()) {
      setError(t("auth.signup.nameRequired"));
      return;
    }
    if (!emailValid) {
      setError(t("auth.signup.emailInvalidShort"));
      return;
    }
    if (!passwordValid) {
      setError(t("auth.signup.rulesFail"));
      return;
    }
    if (!passwordsMatch) {
      setError(t("auth.signup.confirmMismatchFull"));
      return;
    }
    setLoading(true);
    try {
      // Remember the country for the compass onboarding; the profile copy
      // goes to the backend in the same call.
      try {
        localStorage.setItem(COUNTRY_STORAGE_KEY, country);
      } catch {
        // Non-fatal: the backend copy is what matters.
      }
      // TODO: education_level joins here once the course-level select lands.
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        country,
      });
      setSuccess(t("auth.signup.success"));
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.signup.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  // #meehikasharma
  return (
    <AuthShell
      eyebrow={t("auth.signup.eyebrow")}
      title={t("auth.signup.title")}
      subtitle={t("auth.signup.subtitle")}
    >
      <form className="space-y-5" onSubmit={handleSignup}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.signup.nameLabel")}</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              autoComplete="name"
              placeholder={t("auth.signup.namePlaceholder")}
              className="pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.signup.emailLabel")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              autoComplete="email"
              placeholder={t("auth.signup.emailPlaceholder")}
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
            />
          </div>
          {emailTouched && email.length > 0 && !emailValid && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <X className="h-3 w-3" /> {t("auth.signup.emailInvalid")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.signup.countryLabel")}</Label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Select value={country} onValueChange={(value) => setCountry(value)}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder={t("auth.signup.countryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((item) => (
                                    <SelectItem key={item.code} value={item.code}>
                    <FlagMini code={item.code} />
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
                    <p className="text-xs text-muted-foreground">{t("auth.signup.countryHint")}</p>
          <CompassRose country={country} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.signup.passwordLabel")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.signup.passwordPlaceholder")}
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.signup.confirmLabel")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {/* #athenanair */}
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.signup.confirmPlaceholder")}
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
              />
            </div>
            {confirmTouched && confirmPassword.length > 0 && !passwordsMatch && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <X className="h-3 w-3" /> {t("auth.signup.confirmMismatch")}
              </p>
            )}
          </div>
        </div>
        {password.length > 0 && (
          <div className="rounded-2xl border border-border p-3 text-xs space-y-1.5">
            {passwordChecks.map((rule) => (
              <p
                key={rule.key}
                className={`flex items-center gap-1.5 ${rule.passed ? "text-emerald-600" : "text-muted-foreground"}`}
              >
                {rule.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {t(rule.labelKey)}
              </p>
            ))}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground" role="status">
            {success}
          </div>
        )}
        <Button
          ref={signupButton.ref}
          type="submit"
          className="w-full rounded-2xl bg-primary py-6 text-base font-medium text-primary-foreground shadow-card"
          disabled={loading}
          {...signupButton.pressProps}
        >
          {loading ? t("auth.signup.submitting") : (
            <span className="inline-flex items-center gap-2">{t("auth.signup.submit")} <ArrowRight className="h-4 w-4" /></span>
          )}
        </Button>
        {/* #akshitsaini */}
        {/* The whole line is one link: users tap the question as often as the answer. */}
        <Link
          to="/login"
          className="flex items-center justify-between text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <span>{t("auth.signup.haveAccount")}</span>
          <span className="font-medium text-foreground">{t("auth.signup.loginLink")}</span>
        </Link>
      </form>
    </AuthShell>
  );
};

// #kintanjain
export default SignupPage;