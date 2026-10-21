import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { type ApiUser, getMe, getToken, logout as apiLogout } from "@/lib/apiClient";

export interface DemoUserProfile {
  id: string;
  name: string;
  email: string;
  role: "demo";
}

export type AppUser = ApiUser | DemoUserProfile;

/** The name to show for either kind of user. */
export function displayName(user: AppUser | null): string | null {
  if (!user) return null;
  return user.name ?? null;
}

/** Initials for the avatar, e.g. "Vansh Kapoor" -> "VK". Max two letters. */
export function initials(user: AppUser | null): string | null {
  const name = displayName(user);
  if (!name) return null;
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_STORAGE_KEY = "cash-compass-demo-mode-v1";

const DEMO_USER: DemoUserProfile = {
  id: "demo-user",
  name: "name",
  email: "you@gmail.com",
  role: "demo",
};

const readDemoMode = () => {
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authUser, setAuthUser] = useState<ApiUser | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(readDemoMode());
  const [loading, setLoading] = useState(true);
  const finance = useFinance();

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAuthUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setAuthUser(me);
    } catch {
      // token invalid/expired
      apiLogout();
      setAuthUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, String(isDemoMode));
    } catch {
      // Ignore localStorage failures in restrictive environments.
    }
  }, [isDemoMode]);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setLoading(false);

    try {
      finance.resetAll();
    } catch (e) {
      // ignore if finance provider isn't available
    }

    try {
      localStorage.removeItem("cash-compass-range-v1");
      localStorage.removeItem("cash-compass-day-plans-v1");
      localStorage.removeItem("cash-compass-finance-v1");
    } catch {
      // ignore
    }
  }, [finance]);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
  }, []);

  const signOut = useCallback(async () => {
    disableDemoMode();
    apiLogout();
    setAuthUser(null);
  }, [disableDemoMode]);

  const user = isDemoMode ? DEMO_USER : authUser;

  const value = useMemo(
    () => ({
      user,
      loading,
      isDemoMode,
      enableDemoMode,
      disableDemoMode,
      signOut,
      refreshUser,
    }),
    [user, loading, isDemoMode, enableDemoMode, disableDemoMode, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
