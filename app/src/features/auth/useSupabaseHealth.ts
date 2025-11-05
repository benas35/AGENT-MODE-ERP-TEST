import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function useSupabaseHealth(enabled: boolean) {
  const hasRun = useRef(false);
  const isLocal = import.meta.env.VITE_APP_ENV === "local";

  useEffect(() => {
    if (!enabled || hasRun.current) {
      return;
    }

    hasRun.current = true;
    const client = getSupabaseClient();

    client
      .from("profiles")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        if (error) {
          console.error("[supabase-health] profiles probe failed", error);
          return;
        }

        if (isLocal) {
          console.info("[supabase-health] Supabase connection healthy");
        }
      })
      .catch((unexpected) => {
        console.error("[supabase-health] unexpected error", unexpected);
      });
  }, [enabled, isLocal]);
}
