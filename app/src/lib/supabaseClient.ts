import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const REQUIRED_SUPABASE_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;

type RequiredSupabaseKey = (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];

type EnvShape = Record<string, string | undefined>;

type FallbackShape = Partial<Record<RequiredSupabaseKey, string>> | null;

const LEGACY_KEY_ALIASES: Record<RequiredSupabaseKey, string[]> = {
  VITE_SUPABASE_URL: [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "REACT_APP_SUPABASE_URL",
    "PUBLIC_SUPABASE_URL",
  ],
  VITE_SUPABASE_ANON_KEY: [
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLIC_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "REACT_APP_SUPABASE_ANON_KEY",
    "PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ],
};

let fallbackConfig: FallbackShape = null;
let cachedClient: SupabaseClient | null = null;

function applyFallback(overrides: FallbackShape) {
  if (!overrides) {
    return null;
  }

  return {
    VITE_SUPABASE_URL: overrides.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: overrides.VITE_SUPABASE_ANON_KEY,
  } satisfies NonNullable<FallbackShape>;
}

function resolveWithAliases(key: RequiredSupabaseKey, env: EnvShape) {
  const direct = env[key];
  if (direct) {
    return direct;
  }

  const fallback = fallbackConfig?.[key];
  if (fallback) {
    return fallback;
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

function resolveSupabaseUrl(env: EnvShape = import.meta.env as EnvShape) {
  return resolveWithAliases("VITE_SUPABASE_URL", env) ?? "";
}

function resolveSupabaseAnonKey(env: EnvShape = import.meta.env as EnvShape) {
  return resolveWithAliases("VITE_SUPABASE_ANON_KEY", env) ?? "";
}

export function collectMissingSupabaseEnv(env: EnvShape = import.meta.env as EnvShape) {
  return REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !resolveWithAliases(key, env));
}

export function setSupabaseEnvFallback(overrides: FallbackShape) {
  const next = applyFallback(overrides);
  const prev = fallbackConfig;

  const didChange =
    next?.VITE_SUPABASE_URL !== prev?.VITE_SUPABASE_URL ||
    next?.VITE_SUPABASE_ANON_KEY !== prev?.VITE_SUPABASE_ANON_KEY;

  fallbackConfig = next;

  if (didChange) {
    resetSupabaseClient();
  }
}

function createSupabaseClient() {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const client = createSupabaseClient();

    if (!client) {
      throw new Error("Supabase URL/Anon key missing");
    }

    cachedClient = client;
  }

  return cachedClient;
}

export function getSupabaseClientOrNull(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const client = createSupabaseClient();
  if (!client) {
    return null;
  }

  cachedClient = client;
  return cachedClient;
}

export function resetSupabaseClient() {
  cachedClient = null;
}
