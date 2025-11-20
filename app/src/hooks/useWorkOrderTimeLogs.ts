import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { TimeLog } from "@/types/database";

export interface WorkOrderTimeLogEntry extends TimeLog {
  user?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface CreateTimeLogPayload {
  minutes: number;
  notes?: string;
  billable?: boolean;
  hourlyRate?: number | null;
}

export const useWorkOrderTimeLogs = (workOrderId?: string | null) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [timeLogs, setTimeLogs] = useState<WorkOrderTimeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!workOrderId) {
      setTimeLogs([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("time_logs")
        .select(
          "*, user:profiles!time_logs_user_id_fkey(id, first_name, last_name, avatar_url)",
        )
        .eq("work_order_id", workOrderId)
        .order("clock_in", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTimeLogs((data ?? []) as WorkOrderTimeLogEntry[]);
    } catch (err) {
      console.error("Failed to load time logs", err);
      setError(err instanceof Error ? err.message : "Unable to load time tracking records");
      setTimeLogs([]);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logTime = useCallback(
    async ({ minutes, notes, billable, hourlyRate }: CreateTimeLogPayload) => {
      if (!profile?.org_id || !profile.id || !workOrderId) {
        throw new Error("Missing context for logging time");
      }

      if (!minutes || minutes <= 0) {
        throw new Error("Duration must be greater than zero");
      }

      const now = new Date();
      const clockOut = now.toISOString();
      const clockIn = new Date(now.getTime() - minutes * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from("time_logs").insert({
        org_id: profile.org_id,
        user_id: profile.id,
        work_order_id: workOrderId,
        clock_in: clockIn,
        clock_out: clockOut,
        duration_minutes: minutes,
        notes: notes ?? null,
        billable: billable ?? true,
        hourly_rate: hourlyRate ?? null,
      });

      if (insertError) {
        console.error("Failed to record time log", insertError);
        toast({
          title: "Unable to log time",
          description: insertError.message,
          variant: "destructive",
        });
        throw insertError;
      }

      await supabase.rpc("log_work_order_activity", {
        p_work_order_id: workOrderId,
        p_action: "time.logged",
        p_details: {
          minutes,
          notes,
          userId: profile.id,
        },
      });

      const units = minutes === 1 ? "minute" : "minutes";
      toast({
        title: "Time entry recorded",
        description: `${minutes} ${units} logged for this work order.`,
      });

      await fetchLogs();
    },
    [fetchLogs, profile?.id, profile?.org_id, toast, workOrderId],
  );

  return {
    timeLogs,
    loading,
    error,
    refresh: fetchLogs,
    logTime,
  };
};
