import { afterEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn(() => ({ marker: Symbol("client") }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

const originalEnv = { ...import.meta.env } as Record<string, string | undefined>;

function getEnv() {
  return import.meta.env as Record<string, string | undefined>;
}

afterEach(() => {
  createClientMock.mockClear();
  const env = getEnv();

  for (const key of Object.keys(env)) {
    if (!(key in originalEnv)) {
      Reflect.deleteProperty(env, key);
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    env[key] = value;
  }
});

describe("getSupabaseClient", () => {
  it("throws when required environment variables are missing", async () => {
    vi.resetModules();
    const env = getEnv();
    env.VITE_SUPABASE_URL = "";
    env.VITE_SUPABASE_ANON_KEY = "";

    const module = await import("../supabaseClient");

    expect(module.getSupabaseClientOrNull()).toBeNull();
    expect(() => module.getSupabaseClient()).toThrowError(
      "Supabase URL/Anon key missing",
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates and caches a Supabase client when env is configured", async () => {
    vi.resetModules();
    const env = getEnv();
    env.VITE_SUPABASE_URL = "https://example.supabase.co";
    env.VITE_SUPABASE_ANON_KEY = "anon-key";

    const module = await import("../supabaseClient");

    const first = module.getSupabaseClient();
    const second = module.getSupabaseClientOrNull();

    expect(first).toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  });

  it("falls back to SUPABASE_URL and SUPABASE_ANON_KEY when vite env vars are missing", async () => {
    vi.resetModules();
    const env = getEnv();
    Reflect.deleteProperty(env, "VITE_SUPABASE_URL");
    Reflect.deleteProperty(env, "VITE_SUPABASE_ANON_KEY");
    env.SUPABASE_URL = "https://fallback.supabase.co";
    env.SUPABASE_ANON_KEY = "fallback-anon";

    const module = await import("../supabaseClient");

    module.getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://fallback.supabase.co",
      "fallback-anon",
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  });

  it("uses VITE_SUPABASE_PUBLISHABLE_KEY as a final anon key fallback", async () => {
    vi.resetModules();
    const env = getEnv();
    env.VITE_SUPABASE_URL = "https://example.supabase.co";
    Reflect.deleteProperty(env, "VITE_SUPABASE_ANON_KEY");
    Reflect.deleteProperty(env, "SUPABASE_ANON_KEY");
    env.VITE_SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    const module = await import("../supabaseClient");

    module.getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-key",
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  });

  it("can use runtime fallbacks when explicitly configured", async () => {
    vi.resetModules();
    const env = getEnv();
    env.VITE_SUPABASE_URL = "";
    env.VITE_SUPABASE_ANON_KEY = "";

    const module = await import("../supabaseClient");

    module.setSupabaseEnvFallback({
      VITE_SUPABASE_URL: "https://runtime.supabase.co",
      VITE_SUPABASE_ANON_KEY: "runtime-anon",
    });

    const client = module.getSupabaseClient();
    expect(client).toBeDefined();
    expect(createClientMock).toHaveBeenCalledWith(
      "https://runtime.supabase.co",
      "runtime-anon",
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  });
});

describe("resetSupabaseClient", () => {
  it("clears the cached client", async () => {
    vi.resetModules();
    const env = getEnv();
    env.VITE_SUPABASE_URL = "https://example.supabase.co";
    env.VITE_SUPABASE_ANON_KEY = "anon-key";

    const module = await import("../supabaseClient");

    const first = module.getSupabaseClient();
    module.resetSupabaseClient();
    const second = module.getSupabaseClient();

    expect(first).not.toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });
});
