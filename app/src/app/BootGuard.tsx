import type { ReactNode } from "react";
import {
  collectMissingSupabaseEnv,
  REQUIRED_SUPABASE_ENV_KEYS,
  setSupabaseEnvFallback,
} from "@/lib/supabaseClient";

interface BootGuardProps {
  children: ReactNode;
}

const DEMO_SUPABASE_ENV = {
  VITE_SUPABASE_URL: "https://demo-placeholder.supabase.co",
  VITE_SUPABASE_ANON_KEY: "demo-placeholder-key",
} as const;

let hasWarnedDemoMode = false;

export function BootGuard({ children }: BootGuardProps) {
  const missing = collectMissingSupabaseEnv();

  if (missing.length > 0) {
    setSupabaseEnvFallback(DEMO_SUPABASE_ENV);

    if (!hasWarnedDemoMode) {
      console.warn("Running in demo mode — Supabase not connected.", {
        missing,
        demoValues: DEMO_SUPABASE_ENV,
      });
      hasWarnedDemoMode = true;
    }

    return (
      <>
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Missing Supabase environment variables. Running in demo mode with placeholder credentials. Copy
          <code className="mx-1">.env.local.example</code>
          to
          <code className="mx-1">.env.local</code>
          {" "}
          and fill {REQUIRED_SUPABASE_ENV_KEYS.length > 1 ? "them" : "it"}{" "}
          in for a real connection.
        </div>
        {children}
      </>
    );
  }

  if (hasWarnedDemoMode) {
    hasWarnedDemoMode = false;
  }

  setSupabaseEnvFallback(null);

  return <>{children}</>;
}
