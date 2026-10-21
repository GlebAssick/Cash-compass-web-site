// #akshitsaini
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isDemoMode } = useAuth();
  const location = useLocation();

  if (loading) {
    // #vanshkapoor
    return <div className="min-h-screen bg-background" />;
  }

  if (!user && !isDemoMode) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};