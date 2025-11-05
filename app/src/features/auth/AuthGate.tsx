import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Auth from "@/pages/Auth";
import { AppSplash } from "@/app/AppSplash";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppSplash message="Checking your session…" />;
  }

  if (!user) {
    return <Auth key={`auth-gate-${location.pathname}`} />;
  }

  return <>{children}</>;
}
