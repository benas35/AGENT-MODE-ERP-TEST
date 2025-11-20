import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WorkOrderApproval } from "@/types/database";

export const useWorkOrderApprovals = (workOrderId?: string | null) => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<WorkOrderApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!workOrderId) {
      setApprovals([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("work_order_approvals")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setApprovals((data ?? []) as WorkOrderApproval[]);
    } catch (err) {
      console.error("Failed to load work order approvals", err);
      setError(err instanceof Error ? err.message : "Unable to load approvals");
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const requestApproval = useCallback(
    async (message?: string | null) => {
      if (!workOrderId) {
        throw new Error("Missing work order identifier");
      }

      const { data, error: requestError } = await supabase.rpc(
        "request_work_order_approval",
        {
          p_work_order_id: workOrderId,
          p_message: message ?? null,
        },
      );

      if (requestError) {
        console.error("Failed to request approval", requestError);
        toast({
          title: "Unable to request approval",
          description: requestError.message,
          variant: "destructive",
        });
        throw requestError;
      }

      toast({
        title: "Approval requested",
        description: "The customer will be notified to review the work order.",
      });

      await fetchApprovals();
      return data as WorkOrderApproval;
    },
    [fetchApprovals, toast, workOrderId],
  );

  return {
    approvals,
    loading,
    error,
    refresh: fetchApprovals,
    requestApproval,
  };
};
