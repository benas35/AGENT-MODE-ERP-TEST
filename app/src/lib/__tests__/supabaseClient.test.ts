import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectMissingSupabaseEnv,
  ensureSupabaseClient,
  resetSupabaseClient,
  SupabaseConfigError,
} from "../supabaseClient";

const originalUrl = import.meta.env.VITE_SUPABASE_URL;
const originalAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const originalLegacy = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  resetSupabaseClient();
  vi.unstubAllEnvs();
  if (originalUrl) {
    vi.stubEnv("VITE_SUPABASE_URL", originalUrl);
  }
  if (originalAnon) {
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", originalAnon);
  }
  if (originalLegacy) {
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", originalLegacy);
  }
});

describe("collectMissingSupabaseEnv", () => {
  it("returns missing keys", () => {
    const missing = collectMissingSupabaseEnv({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: undefined } as any);
    expect(missing).toEqual(["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]);
  });

  it("returns empty array when all present", () => {
    const missing = collectMissingSupabaseEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon",
    } as any);
    expect(missing).toEqual([]);
  });

  it("treats legacy publishable key as satisfying anon key", () => {
    const missing = collectMissingSupabaseEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "legacy-key",
    } as any);

    expect(missing).toEqual([]);
  });
});

describe("ensureSupabaseClient", () => {
  it("throws when environment variables are missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    expect(() => ensureSupabaseClient()).toThrow(SupabaseConfigError);
  });

  it("creates a singleton Supabase client when env is configured", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

    const client = ensureSupabaseClient();
    const second = ensureSupabaseClient();

    expect(client).toBe(second);
    expect(typeof client).toBe("object");
  });

  it("uses legacy publishable key when anon key is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "legacy-key");

    const client = ensureSupabaseClient();
    expect(client).toBeDefined();
  });
});
