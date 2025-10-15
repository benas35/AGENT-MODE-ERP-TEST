import { useEffect } from "react";
import type { ReactNode } from "react";
import { collectMissingSupabaseEnv, REQUIRED_SUPABASE_ENV_KEYS } from "@/lib/supabaseClient";

interface BootGuardProps {
  children: ReactNode;
}

let hasWarned = false;

export function BootGuard({ children }: BootGuardProps) {
  useEffect(() => {
    const missing = collectMissingSupabaseEnv();

    if (missing.length > 0 && !hasWarned) {
      console.warn(
        "Supabase environment variables are missing. Expected keys:",
        REQUIRED_SUPABASE_ENV_KEYS,
      );
      hasWarned = true;
    }
  }, []);

  return <>{children}</>;
}
