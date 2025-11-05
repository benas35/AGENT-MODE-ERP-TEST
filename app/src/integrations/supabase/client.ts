import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient, resetSupabaseClient } from "@/lib/supabaseClient";
import type { Database } from "@/integrations/supabase/types";

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { getSupabaseClient, resetSupabaseClient };
