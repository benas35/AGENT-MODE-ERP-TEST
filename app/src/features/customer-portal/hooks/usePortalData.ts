import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalSession } from "./usePortalSession";
import type { PortalPreferences } from "../context/PortalSessionContext";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type PortalWorkOrder = {
  id: string;
  status: string | null;
  title: string | null;
  description: string | null;
  workOrderNumber: string;
  createdAt: string | null;
  updatedAt: string | null;
  promisedAt: string | null;
  completedAt: string | null;
  priority: string | null;
  subtotal: number | null;
  total: number | null;
  vehicle?: {
    id: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
    licensePlate?: string | null;
    media?: {
      id: string;
      kind: string | null;
      storagePath: string;
      caption: string | null;
    }[];
  } | null;
  media: {
    id: string;
    category: string;
    storagePath: string;
    caption: string | null;
    createdAt: string;
    publicUrl?: string | null;
  }[];
};

export type PortalMessage = {
  id: string;
  direction: "staff" | "customer";
  body: string;
  createdAt: string;
  readByCustomerAt: string | null;
  readByStaffAt: string | null;
  metadata: Json | null;
};

export const usePortalWorkOrders = () => {
  const { session } = usePortalSession();

  return useQuery({
    queryKey: ["portal", "work-orders", session?.customerId, session?.workOrderId],
    enabled: Boolean(session),
    queryFn: async (): Promise<PortalWorkOrder[]> => {
      if (!session) return [];

      let query = supabase
        .from("work_orders")
        .select(
          "id, status, title, description, work_order_number, created_at, updated_at, promised_at, completed_at, priority, subtotal, total, vehicle:vehicles(id, make, model, year, license_plate), work_order_media(id, category, storage_path, caption, created_at)"
        )
        .eq("customer_id", session.customerId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false });

      if (session.workOrderId) {
        query = query.eq("id", session.workOrderId);
      }

      const { data, error } = await query.returns<any[]>();
      if (error) {
        console.error("Failed to load portal work orders", error);
        throw error;
      }

      if (!data) return [];

      const workOrders: PortalWorkOrder[] = await Promise.all(
        data.map(async (item) => {
          const vehicleMediaResponse = await supabase
            .from("vehicle_media")
            .select("id, kind, storage_path, caption")
            .eq("vehicle_id", item.vehicle?.id ?? "")
            .order("sort_order", { ascending: true });

          return {
            id: item.id,
            status: item.status,
            title: item.title,
            description: item.description,
            workOrderNumber: item.work_order_number,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            promisedAt: item.promised_at,
            completedAt: item.completed_at,
            priority: item.priority,
            subtotal: item.subtotal,
            total: item.total,
            vehicle: item.vehicle
              ? {
                  id: item.vehicle.id,
                  make: item.vehicle.make,
                  model: item.vehicle.model,
                  year: item.vehicle.year,
                  licensePlate: item.vehicle.license_plate,
                  media: vehicleMediaResponse.data?.map((media) => ({
                    id: media.id,
                    kind: media.kind,
                    storagePath: media.storage_path,
                    caption: media.caption,
                    publicUrl: supabase.storage.from("vehicle-photos").getPublicUrl(media.storage_path).data.publicUrl ?? null,
                  })) ?? [],
                }
              : null,
            media:
              item.work_order_media?.map((media: any) => ({
                id: media.id,
                category: media.category,
                storagePath: media.storage_path,
                caption: media.caption,
                createdAt: media.created_at,
                publicUrl: supabase.storage.from("work-order-photos").getPublicUrl(media.storage_path).data.publicUrl ?? null,
              })) ?? [],
          };
        }),
      );

      return workOrders;
    },
  });
};

export const usePortalMessages = (workOrderId: string | null) => {
  const { session } = usePortalSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["portal", "messages", session?.customerId, workOrderId ?? "all"],
    [session?.customerId, workOrderId],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(session),
    queryFn: async (): Promise<PortalMessage[]> => {
      if (!session) return [];
      let builder = supabase
        .from("customer_messages")
        .select("id, direction, body, created_at, read_by_customer_at, read_by_staff_at, metadata")
        .eq("customer_id", session.customerId)
        .order("created_at", { ascending: true });

      if (workOrderId) {
        builder = builder.eq("work_order_id", workOrderId);
      }

      const { data, error } = await builder;
      if (error) {
        console.error("Failed to load portal messages", error);
        throw error;
      }

      return (
        data?.map((message) => ({
          id: message.id,
          direction: message.direction as PortalMessage["direction"],
          body: message.body,
          createdAt: message.created_at,
          readByCustomerAt: message.read_by_customer_at,
          readByStaffAt: message.read_by_staff_at,
          metadata: message.metadata ?? null,
        })) ?? []
      );
    },
  });

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`portal-messages-${session.customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_messages",
          filter: `customer_id=eq.${session.customerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.customerId, queryClient, queryKey]);

  const sendMutation = useMutation({
    mutationFn: async (input: { body: string; workOrderId: string | null }) => {
      if (!session) throw new Error("No portal session");
      const { error } = await supabase.from("customer_messages").insert({
        org_id: session.orgId,
        customer_id: session.customerId,
        work_order_id: input.workOrderId,
        direction: "customer",
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Nepavyko išsiųsti žinutės",
        description: "Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    sendMessage: sendMutation.mutateAsync,
  };
};

export const usePortalPreferences = () => {
  const { session, updatePreferences } = usePortalSession();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prefs: PortalPreferences) => {
      if (!session) return;
      const { error } = await supabase.from("customer_notification_preferences").upsert({
        org_id: session.orgId,
        customer_id: session.customerId,
        notify_email: prefs.notify_email,
        notify_sms: prefs.notify_sms,
        notify_whatsapp: prefs.notify_whatsapp,
      });
      if (error) throw error;
      updatePreferences(prefs);
    },
    onSuccess: () => {
      toast({
        title: "Nustatymai atnaujinti",
        description: "Pranešimų nustatymai pritaikyti.",
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Nepavyko išsaugoti",
        description: "Bandykite dar kartą.",
        variant: "destructive",
      });
    },
  });
};

export const useServiceHistoryDownload = () => {
  const { session } = usePortalSession();
  const { toast } = useToast();

  return useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("work_orders")
      .select("work_order_number, status, created_at, completed_at, total")
      .eq("customer_id", session.customerId)
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to export history", error);
      toast({
        title: "Nepavyko parengti ataskaitos",
        description: "Bandykite dar kartą.",
        variant: "destructive",
      });
      return;
    }

    const header = "Darbo užsakymas,Statusas,Sukurta,Įvykdyta,Suma";
    const rows = (data ?? []).map((row) =>
      [
        row.work_order_number,
        row.status,
        row.created_at,
        row.completed_at ?? "",
        row.total ?? "",
      ].join(","),
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `service-history-${session.customerId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [session, toast]);
};
