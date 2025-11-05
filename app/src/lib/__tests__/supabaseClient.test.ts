import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_URL = import.meta.env.VITE_SUPABASE_URL;
const ORIGINAL_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (ORIGINAL_URL) {
    vi.stubEnv("VITE_SUPABASE_URL", ORIGINAL_URL);
  }
  if (ORIGINAL_ANON) {
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", ORIGINAL_ANON);
  }
});

describe("getSupabaseClient", () => {
  it("throws when required environment variables are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const { getSupabaseClient } = await import("../supabaseClient");

    expect(() => getSupabaseClient()).toThrowError(/Supabase URL\/Anon key missing/);
  });

  it("creates a singleton client when env is configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

    const { getSupabaseClient } = await import("../supabaseClient");

    const client = getSupabaseClient();
    const second = getSupabaseClient();

    expect(client).toBe(second);
  });

  it("does not allow non-VITE fallbacks", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_URL", "https://fallback.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "fallback-anon");

    const { getSupabaseClient } = await import("../supabaseClient");

    expect(() => getSupabaseClient()).toThrowError(/Supabase URL\/Anon key missing/);
  });
});
