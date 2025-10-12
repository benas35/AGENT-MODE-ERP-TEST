import type { ReactNode } from "react";
import { collectMissingSupabaseEnv, REQUIRED_SUPABASE_ENV_KEYS } from "@/lib/supabaseClient";

interface BootGuardProps {
  children: ReactNode;
}

export function BootGuard({ children }: BootGuardProps) {
  const missing = collectMissingSupabaseEnv();

  if (missing.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-xl rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive shadow-lg"
        >
          <h1 className="text-xl font-semibold">Configuration required</h1>
          <p className="mt-2 text-sm text-destructive/80">
            We couldn&apos;t start Oldauta because the following environment variables are missing:
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm">
            {missing.map((key) => (
              <li key={key} className="font-mono">
                {key}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-destructive/70">
            Add them to your <code>.env.local</code> file ({REQUIRED_SUPABASE_ENV_KEYS.join(", ")}) and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
