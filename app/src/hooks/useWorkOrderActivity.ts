import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderActivity } from "@/types/database";

export interface WorkOrderActivityEntry extends WorkOrderActivity {
  actor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
}

export const useWorkOrderActivity = (workOrderId?: string | null) => {
  const [activity, setActivity] = useState<WorkOrderActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!workOrderId) {
      setActivity([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("work_order_activity")
        .select(
          "*, actor:profiles!work_order_activity_actor_id_fkey(id, first_name, last_name, avatar_url, role)",
        )
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) {
        throw fetchError;
      }

      setActivity((data ?? []) as WorkOrderActivityEntry[]);
    } catch (err) {
      console.error("Failed to load work order activity", err);
      setError(err instanceof Error ? err.message : "Unable to load activity log");
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const logActivity = useCallback(
    async (action: string, details?: Record<string, unknown>) => {
      if (!workOrderId) return;
      await supabase.rpc("log_work_order_activity", {
        p_work_order_id: workOrderId,
        p_action: action,
        p_details: details ?? {},
      });
      await fetchActivity();
    },
    [fetchActivity, workOrderId],
  );

  return {
    activity,
    loading,
    error,
    refresh: fetchActivity,
    logActivity,
  };
};
