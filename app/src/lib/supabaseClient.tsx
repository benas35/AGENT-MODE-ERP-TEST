import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

export const REQUIRED_SUPABASE_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;

type RequiredSupabaseKey = (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];

type EnvShape = Record<string, string | undefined>;

export function collectMissingSupabaseEnv(env: EnvShape = import.meta.env): RequiredSupabaseKey[] {
  return REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !env[key]);
}

export class SupabaseConfigError extends Error {
  constructor(public missingKeys: RequiredSupabaseKey[]) {
    super(`Missing Supabase environment variables: ${missingKeys.join(", ")}`);
  }
}

let cachedClient: SupabaseClient<Database> | null = null;

export function ensureSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const missing = collectMissingSupabaseEnv();
  if (missing.length > 0) {
    throw new SupabaseConfigError(missing);
  }

  cachedClient = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return cachedClient;
}

export function resetSupabaseClient() {
  cachedClient = null;
}

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => ensureSupabaseClient(), []);

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabaseClient() {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("useSupabaseClient must be used within a SupabaseProvider");
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property, receiver) {
    const client = ensureSupabaseClient();
    const value = Reflect.get(client, property, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as SupabaseClient<Database>;
