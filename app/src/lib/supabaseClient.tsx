import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

export const REQUIRED_SUPABASE_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;

type RequiredSupabaseKey = (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];

const LEGACY_KEY_ALIASES: Record<RequiredSupabaseKey, string[]> = {
  VITE_SUPABASE_URL: [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "REACT_APP_SUPABASE_URL",
    "PUBLIC_SUPABASE_URL",
  ],
  VITE_SUPABASE_ANON_KEY: [
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLIC_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "REACT_APP_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_ANON_KEY",
  ],
};

type EnvShape = Record<string, string | undefined>;

function resolveWithAliases(key: RequiredSupabaseKey, env: EnvShape) {
  if (env[key]) {
    return env[key];
  }

  const aliases = LEGACY_KEY_ALIASES[key] ?? [];
  for (const alias of aliases) {
    const value = env[alias];
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function collectMissingSupabaseEnv(env: EnvShape = import.meta.env): RequiredSupabaseKey[] {
  return REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !resolveWithAliases(key, env));
}

function resolveSupabaseUrl(env: EnvShape = import.meta.env) {
  return resolveWithAliases("VITE_SUPABASE_URL", env);
}

function resolveSupabaseAnonKey(env: EnvShape = import.meta.env) {
  return resolveWithAliases("VITE_SUPABASE_ANON_KEY", env);
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

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseAnonKey();

  cachedClient = createClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
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
