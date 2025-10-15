import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getSupabaseClient, resetSupabaseClient } from "@/lib/supabaseClient";

export { getSupabaseClient, resetSupabaseClient };

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property, receiver) {
    const client = getSupabaseClient() as SupabaseClient<Database>;
    const value = Reflect.get(client, property, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as SupabaseClient<Database>;
