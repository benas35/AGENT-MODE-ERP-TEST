import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.SUPABASE_URL ??
  "";

const ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    if (!URL || !ANON) {
      // Allow BootGuard to render a nice panel when missing.
      throw new Error("Supabase URL/Anon key missing");
    }
    cachedClient = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cachedClient;
}

export function resetSupabaseClient() {
  cachedClient = null;
}
