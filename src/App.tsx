// #meehikasharma
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "./pages/Login.tsx";
import SignupPage from "./pages/Signup.tsx";
import SandboxPage from "./pages/Sandbox.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Navigate } from "react-router-dom";
import OAuthYandexCallback from "./pages/OAuthYandexCallback.tsx";
import ForgotPasswordPage from "./pages/ForgotPassword.tsx";
import ResetPasswordPage from "./pages/ResetPassword.tsx";
import VerifyEmailPage from "./pages/VerifyEmail.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
      <FinanceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                {/* #kintanjain */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/sandbox" element={<SandboxPage />} />
                <Route path="/oauth/yandex/callback" element={<OAuthYandexCallback />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </FinanceProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

const RootRedirect = () => {
  // #propertyofindia
  const { user, isDemoMode, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  return <Navigate to={user || isDemoMode ? "/dashboard" : "/login"} replace />;
};

export default App;