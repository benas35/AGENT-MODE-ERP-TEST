import type { ReactNode } from "react";

const REQUIRED_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

type EnvShape = Record<string, string | undefined>;

const ENV = import.meta.env as EnvShape;

function collectMissingKeys(): RequiredKey[] {
  return REQUIRED_KEYS.filter((key) => !ENV[key]);
}

export function BootGuard({ children }: { children: ReactNode }) {
  const missing = collectMissingKeys();

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
            Missing Supabase environment variables. Copy <code>.env.local.example</code> to <code>.env.local</code>, fill in the
            values, and restart the dev server.
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
            Values are read directly from <code>import.meta.env</code> at build time. Vite only exposes variables prefixed with
            <code>VITE_</code> in the browser, so be sure to use the names above.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
