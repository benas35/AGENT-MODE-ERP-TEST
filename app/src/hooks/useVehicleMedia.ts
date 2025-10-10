import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type VehicleMediaKind = "hero" | "front" | "rear" | "interior" | "damage";

export interface VehicleMediaItem {
  id: string;
  org_id: string;
  vehicle_id: string;
  created_by: string | null;
  created_at: string;
  storage_path: string;
  kind: VehicleMediaKind;
  caption: string | null;
  sort_order: number;
  url: string;
}

const queryKey = (vehicleId?: string) => ["vehicle-media", vehicleId];

export const useVehicleMedia = (vehicleId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mediaQuery = useQuery({
    queryKey: queryKey(vehicleId),
    enabled: !!vehicleId,
    queryFn: async (): Promise<VehicleMediaItem[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from("vehicle_media")
        .select("id, org_id, vehicle_id, created_by, created_at, storage_path, kind, caption, sort_order")
        .eq("vehicle_id", vehicleId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      if (!data?.length) {
        return [];
      }

      const { data: signedUrls, error: signedError } = await supabase.storage
        .from("vehicle-photos")
        .createSignedUrls(
          data.map((item) => item.storage_path),
          60 * 60,
        );

      if (signedError) {
        throw signedError;
      }

      const items = data.map<VehicleMediaItem>((item, index) => ({
        ...item,
        kind: (item.kind as VehicleMediaKind) ?? "front",
        caption: item.caption ?? null,
        sort_order: item.sort_order ?? index,
        url: signedUrls?.[index]?.signedUrl ?? "",
      }));

      return items.sort((a, b) => {
        if (a.kind === "hero" && b.kind !== "hero") return -1;
        if (b.kind === "hero" && a.kind !== "hero") return 1;
        return a.sort_order - b.sort_order;
      });
    },
    staleTime: 1000 * 30,
  });

  const invalidate = useCallback(() => {
    if (!vehicleId) return;
    return queryClient.invalidateQueries({ queryKey: queryKey(vehicleId) });
  }, [queryClient, vehicleId]);

  const reorderMutation = useMutation({
    mutationFn: async (items: VehicleMediaItem[]) => {
      const updates = items.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      const { error } = await supabase
        .from("vehicle_media")
        .upsert(updates, { onConflict: "id" });

      if (error) throw error;
    },
    onMutate: async (nextOrder) => {
      const previous = queryClient.getQueryData<VehicleMediaItem[]>(queryKey(vehicleId));
      queryClient.setQueryData(queryKey(vehicleId), nextOrder);
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(vehicleId), context.previous);
      }
      toast({
        title: "Unable to reorder media",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Media order updated" });
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: VehicleMediaItem) => {
      const { error: dbError } = await supabase
        .from("vehicle_media")
        .delete()
        .eq("id", item.id);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from("vehicle-photos")
        .remove([item.storage_path]);

      if (storageError) throw storageError;
    },
    onMutate: async (item) => {
      const previous = queryClient.getQueryData<VehicleMediaItem[]>(queryKey(vehicleId));
      queryClient.setQueryData<VehicleMediaItem[]>(queryKey(vehicleId), (old = []) =>
        old.filter((media) => media.id !== item.id),
      );
      return { previous };
    },
    onError: (error, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(vehicleId), context.previous);
      }
      toast({
        title: "Failed to delete photo",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Photo deleted" });
    },
    onSettled: invalidate,
  });

  const setHeroMutation = useMutation({
    mutationFn: async (item: VehicleMediaItem) => {
      if (!vehicleId) return;

      const resetExisting = supabase
        .from("vehicle_media")
        .update({ kind: "front" })
        .eq("vehicle_id", vehicleId)
        .eq("kind", "hero")
        .neq("id", item.id);

      const setNewHero = supabase
        .from("vehicle_media")
        .update({ kind: "hero" })
        .eq("id", item.id);

      const [{ error: resetError }, { error: heroError }] = await Promise.all([resetExisting, setNewHero]);

      if (resetError) throw resetError;
      if (heroError) throw heroError;
    },
    onMutate: async (item) => {
      const previous = queryClient.getQueryData<VehicleMediaItem[]>(queryKey(vehicleId));
      queryClient.setQueryData<VehicleMediaItem[]>(queryKey(vehicleId), (old = []) =>
        old.map((media) => ({
          ...media,
          kind: media.id === item.id ? "hero" : media.kind === "hero" ? "front" : media.kind,
        })),
      );
      return { previous };
    },
    onError: (error, _item, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(vehicleId), context.previous);
      }
      toast({
        title: "Failed to set hero image",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Hero image updated" });
    },
    onSettled: invalidate,
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string | null }) => {
      const { error } = await supabase
        .from("vehicle_media")
        .update({ caption })
        .eq("id", id);

      if (error) throw error;
    },
    onMutate: async ({ id, caption }) => {
      const previous = queryClient.getQueryData<VehicleMediaItem[]>(queryKey(vehicleId));
      queryClient.setQueryData<VehicleMediaItem[]>(queryKey(vehicleId), (old = []) =>
        old.map((media) => (media.id === id ? { ...media, caption: caption ?? null } : media)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(vehicleId), context.previous);
      }
      toast({
        title: "Failed to update caption",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Caption saved" });
    },
    onSettled: invalidate,
  });

  return {
    media: mediaQuery.data ?? [],
    isLoading: mediaQuery.isLoading,
    error: mediaQuery.error,
    reorderMedia: reorderMutation.mutateAsync,
    deleteMedia: deleteMutation.mutateAsync,
    setHero: setHeroMutation.mutateAsync,
    updateCaption: updateCaptionMutation.mutateAsync,
    isReordering: reorderMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSettingHero: setHeroMutation.isPending,
    isUpdatingCaption: updateCaptionMutation.isPending,
    refresh: invalidate,
  };
};
