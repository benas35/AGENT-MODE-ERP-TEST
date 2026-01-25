import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { SignIn } from "@/features/auth/SignIn";
import { useSupabaseHealth } from "@/features/auth/useSupabaseHealth";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const authDisabled = String(import.meta.env.VITE_DISABLE_AUTH).toLowerCase() === "true";
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (authDisabled) {
      setInitializing(false);
      return;
    }

    const client = getSupabaseClient();
    let cancelled = false;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
          setSession(data.session ?? null);
          setInitializing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setInitializing(false);
        }
      });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!cancelled) {
        setSession(nextSession ?? null);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [authDisabled]);

  useSupabaseHealth(!initializing && Boolean(session) && !authDisabled);

  if (authDisabled) {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Checking your session…</span>
      </div>
    );
  }

  if (!session) {
    return <SignIn />;
  }

  return <>{children}</>;
}
