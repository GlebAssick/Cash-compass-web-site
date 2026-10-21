import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithYandex } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const COUNTRY_STORAGE_KEY = "cash-compass-country";
const ALLOWED_COUNTRIES = new Set(["RU", "IN"]);

const getCountry = (): string => {
  try {
    const raw = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (raw && ALLOWED_COUNTRIES.has(raw)) {
      return raw;
    }
  } catch {
    // Ignore localStorage failures in restrictive environments.
  }

  return "RU";
};

const OAuthYandexCallback = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");

    console.log("[Yandex OAuth] hash params:", window.location.hash);
    console.log("[Yandex OAuth] access_token found:", accessToken);

    if (!accessToken) {
      setDebugError(
        "No access_token found in URL hash. Yandex redirect may have failed or been blocked.",
      );
      return;
    }

    const country = getCountry();

    console.log("[Yandex OAuth] sending country:", country);

    loginWithYandex(accessToken, country)
      .then(() => refreshUser())
      .then(() => navigate("/dashboard", { replace: true }))
      .catch((err) => {
        console.error("[Yandex OAuth] loginWithYandex failed:", err);
        setDebugError(err?.message ? String(err.message) : String(err));
      });
  }, [navigate, refreshUser]);

  if (debugError) {
    return (
      <div className="p-8 text-center text-sm">
        <p className="font-semibold text-destructive">Yandex OAuth debug error:</p>
        <p className="mt-2 text-muted-foreground">{debugError}</p>
      </div>
    );
  }

  return (
    <p className="p-8 text-center text-sm text-muted-foreground">
      Signing you in…
    </p>
  );
};

export default OAuthYandexCallback;