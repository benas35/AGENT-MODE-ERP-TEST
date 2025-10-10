import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePortalSession } from "../hooks/usePortalSession";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PortalWorkOrder } from "../hooks/usePortalData";

interface Props {
  workOrder: PortalWorkOrder | null;
}

export const PortalApprovalActions = ({ workOrder }: Props) => {
  const { session } = usePortalSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: async (status: "APPROVED" | "DECLINED") => {
      if (!session || !workOrder) return;
      const { error } = await supabase.rpc("customer_portal_update_work_order", {
        p_work_order_id: workOrder.id,
        p_customer_id: session.customerId,
        p_org_id: session.orgId,
        p_status: status,
        p_comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["portal", "work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "messages"] });
      toast({
        title: status === "APPROVED" ? "Papildomas darbas patvirtintas" : "Papildomas darbas atmestas",
        description: status === "APPROVED"
          ? "Serviso komanda gavo Jūsų patvirtinimą."
          : "Pranešėme patarėjui apie sprendimą.",
      });
      setComment("");
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Nepavyko išsaugoti sprendimo",
        description: "Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprendimas dėl papildomų darbų</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Palikite komentarą patarėjui (nebūtina)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!workOrder || mutation.isPending}
            onClick={() => mutation.mutateAsync("APPROVED")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Patvirtinti darbą
          </Button>
          <Button
            variant="destructive"
            disabled={!workOrder || mutation.isPending}
            onClick={() => mutation.mutateAsync("DECLINED")}
          >
            Atmesti darbą
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
