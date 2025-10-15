import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getSupabaseClient,
  getSupabaseClientOrNull,
  resetSupabaseClient,
  REQUIRED_SUPABASE_ENV_KEYS,
} from "@/lib/supabaseClient";

export { getSupabaseClient, resetSupabaseClient };

function createMissingClientProxy(path: string[] = []): any {
  const message =
    `Supabase is not configured. Please set ${REQUIRED_SUPABASE_ENV_KEYS.join(
      ", ",
    )} in your environment.` +
    (path.length > 0 ? ` Attempted to access \`${path.join(".")}\`.` : "");

  const handler: ProxyHandler<any> = {
    get(_target, property) {
      if (property === "then") {
        return undefined;
      }
      if (property === Symbol.toStringTag) {
        return "MissingSupabaseClient";
      }
      return createMissingClientProxy([...path, String(property)]);
    },
    apply() {
      throw new Error(message);
    },
    construct() {
      throw new Error(message);
    },
  };

  const proxyTarget = function () {
    throw new Error(message);
  };

  return new Proxy(proxyTarget, handler);
}

const missingClient = createMissingClientProxy();

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property, receiver) {
    const client = (getSupabaseClientOrNull() ?? missingClient) as SupabaseClient<Database>;
    const value = Reflect.get(client, property, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as SupabaseClient<Database>;
