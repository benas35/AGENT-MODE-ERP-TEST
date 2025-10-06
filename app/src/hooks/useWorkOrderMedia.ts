import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { createThumbPath } from "@/features/work-orders/utils/media";

export type WorkOrderMediaCategory = "before" | "after" | "issue" | "damage" | "progress";

export interface WorkOrderMediaItem {
  id: string;
  org_id: string;
  work_order_id: string;
  uploaded_by: string;
  uploaded_by_name: string | null;
  storage_path: string;
  category: WorkOrderMediaCategory;
  caption: string | null;
  gps: { lat: number; lng: number; accuracy?: number } | null;
  created_at: string;
  url: string;
  thumbnailUrl: string;
}

const queryKey = (workOrderId?: string) => ["work-order-media", workOrderId];

export const useWorkOrderMedia = (workOrderId?: string) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();

  const mediaQuery = useQuery({
    enabled: Boolean(workOrderId),
    queryKey: queryKey(workOrderId),
    queryFn: async (): Promise<WorkOrderMediaItem[]> => {
      if (!workOrderId) return [];

      const { data, error } = await supabase
        .from("work_order_media")
        .select(
          "id, org_id, work_order_id, uploaded_by, storage_path, category, caption, gps, created_at, profiles:uploaded_by(first_name, last_name)"
        )
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!data?.length) {
        return [];
      }

      const storagePaths = data.flatMap((item) => {
        const thumb = createThumbPath(item.storage_path);
        return thumb === item.storage_path ? [item.storage_path] : [item.storage_path, thumb];
      });

      const { data: signedUrls, error: signedError } = await supabase.storage
        .from("work-order-photos")
        .createSignedUrls(storagePaths, 60 * 30);

      if (signedError) {
        throw signedError;
      }

      const urlMap = new Map<string, string>();
      signedUrls?.forEach((entry) => {
        if (entry.path && entry.signedUrl) {
          urlMap.set(entry.path, entry.signedUrl);
        }
      });

      return data.map<WorkOrderMediaItem>((item) => {
        const thumbPath = createThumbPath(item.storage_path);
        const profile = (item as any).profiles as
          | { first_name?: string | null; last_name?: string | null }
          | null
          | undefined;
        const uploader = profile?.first_name || profile?.last_name
          ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
          : null;

        return {
          id: item.id,
          org_id: item.org_id,
          work_order_id: item.work_order_id,
          uploaded_by: item.uploaded_by,
          uploaded_by_name: uploader,
          storage_path: item.storage_path,
          category: (item.category as WorkOrderMediaCategory) ?? "issue",
          caption: item.caption ?? null,
          gps: (item.gps as WorkOrderMediaItem["gps"]) ?? null,
          created_at: item.created_at,
          url: urlMap.get(item.storage_path) ?? "",
          thumbnailUrl: urlMap.get(thumbPath) ?? urlMap.get(item.storage_path) ?? "",
        };
      });
    },
    staleTime: 1000 * 60,
  });

  const invalidate = useCallback(() => {
    if (!workOrderId) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey: queryKey(workOrderId) });
  }, [queryClient, workOrderId]);

  const uploadMutation = useMutation({
    mutationFn: async (
      variables: {
        file: File;
        category: WorkOrderMediaCategory;
        caption?: string | null;
        gps?: { lat: number; lng: number; accuracy?: number } | null;
      },
    ) => {
      if (!profile?.org_id) {
        throw new Error("Missing organization context for upload");
      }

      if (!workOrderId) {
        throw new Error("workOrderId is required to upload media");
      }

      const formData = new FormData();
      formData.append("orgId", profile.org_id);
      formData.append("workOrderId", workOrderId);
      formData.append("category", variables.category);
      if (variables.caption) formData.append("caption", variables.caption);
      if (variables.gps) formData.append("gps", JSON.stringify(variables.gps));
      formData.append("file", variables.file, variables.file.name);

      const { data, error } = await supabase.functions.invoke("media-process", {
        body: formData,
      });

      if (error) {
        throw new Error(error.message ?? "Unable to upload media");
      }

      const record = (data as { record?: { id: string } } | null)?.record;

      if (record && variables.category === "issue") {
        const { error: notifyError } = await supabase.functions.invoke("notify-customer", {
          body: {
            orgId: profile.org_id,
            workOrderId,
            mediaId: record.id,
            category: variables.category,
          },
        });

        if (notifyError) {
          console.warn("notify-customer failed", notifyError);
        }
      }

      return data;
    },
    onSuccess: async () => {
      await invalidate();
      toast({
        title: "Photo uploaded",
        description: "Media has been processed and saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: WorkOrderMediaItem) => {
      const { error: deleteError } = await supabase
        .from("work_order_media")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      const pathsToRemove = [item.storage_path];
      const thumbPath = createThumbPath(item.storage_path);
      if (thumbPath !== item.storage_path) {
        pathsToRemove.push(thumbPath);
      }

      const { error: storageError } = await supabase.storage
        .from("work-order-photos")
        .remove(pathsToRemove);

      if (storageError && storageError.message && !storageError.message.includes("Not Found")) {
        throw storageError;
      }
    },
    onMutate: async (item) => {
      const previous = queryClient.getQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId));
      queryClient.setQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId), (old = []) => old.filter((media) => media.id !== item.id));
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(workOrderId), context.previous);
      }
      toast({
        title: "Failed to delete photo",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Photo deleted" });
    },
    onSettled: invalidate,
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string | null }) => {
      const { error: updateError } = await supabase
        .from("work_order_media")
        .update({ caption })
        .eq("id", id);

      if (updateError) throw updateError;
    },
    onMutate: async ({ id, caption }) => {
      const previous = queryClient.getQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId));
      queryClient.setQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId), (old = []) =>
        old.map((item) => (item.id === id ? { ...item, caption: caption ?? null } : item)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(workOrderId), context.previous);
      }
      toast({
        title: "Failed to update caption",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Caption updated" });
    },
    onSettled: invalidate,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: WorkOrderMediaCategory }) => {
      const { error: updateError } = await supabase
        .from("work_order_media")
        .update({ category })
        .eq("id", id);

      if (updateError) throw updateError;
    },
    onMutate: async ({ id, category }) => {
      const previous = queryClient.getQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId));
      queryClient.setQueryData<WorkOrderMediaItem[]>(queryKey(workOrderId), (old = []) =>
        old.map((item) => (item.id === id ? { ...item, category } : item)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey(workOrderId), context.previous);
      }
      toast({
        title: "Failed to update category",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    },
    onSettled: invalidate,
  });

  const grouped = useMemo(() => {
    const records = mediaQuery.data ?? [];
    return records.reduce<Record<WorkOrderMediaCategory, WorkOrderMediaItem[]>>(
      (acc, item) => {
        acc[item.category] = acc[item.category] ? [...acc[item.category], item] : [item];
        return acc;
      },
      { before: [], after: [], issue: [], damage: [], progress: [] },
    );
  }, [mediaQuery.data]);

  return {
    media: mediaQuery.data ?? [],
    isLoading: mediaQuery.isLoading,
    error: mediaQuery.error,
    groupedMedia: grouped,
    uploadMedia: uploadMutation.mutateAsync,
    deleteMedia: deleteMutation.mutateAsync,
    updateCaption: updateCaptionMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingCaption: updateCaptionMutation.isPending,
    refresh: invalidate,
  };
};
