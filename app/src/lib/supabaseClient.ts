import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!cached) {
    if (!URL || !ANON) {
      throw new Error("Supabase URL/Anon key missing");
    }

    cached = createClient<Database>(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  return cached;
}

export function resetSupabaseClient() {
  cached = null;
}
