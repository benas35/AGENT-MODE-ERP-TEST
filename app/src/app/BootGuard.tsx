import type { ReactNode } from "react";
import {
  collectMissingSupabaseEnv,
  REQUIRED_SUPABASE_ENV_KEYS,
  setSupabaseEnvFallback,
} from "@/lib/supabaseClient";
import { collectMissingSupabaseEnv, REQUIRED_SUPABASE_ENV_KEYS } from "@/lib/supabaseClient";

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

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-xl rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive shadow-lg"
        >
          <h1 className="text-xl font-semibold">Configuration required</h1>
          <p className="mt-2 text-sm text-destructive/80">
            Missing Supabase environment variables. Please copy <code>.env.local.example</code> to{" "}
            <code>.env.local</code>, fill in the values, and restart the dev server.
          </p>
          <p className="mt-4 text-sm text-destructive/80">The following keys are required:</p>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm">
            {missing.map((key) => (
              <li key={key} className="font-mono">
                {key}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-destructive/70">
            ({REQUIRED_SUPABASE_ENV_KEYS.join(", ")}) are read via <code>import.meta.env</code>. Legacy aliases such as
            <code>SUPABASE_URL</code> or <code>SUPABASE_ANON_KEY</code> are recognised automatically.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
