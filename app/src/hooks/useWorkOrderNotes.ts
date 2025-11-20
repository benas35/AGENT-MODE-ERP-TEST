import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { WorkOrderNote } from "@/types/database";

interface WorkOrderNoteWithAuthor extends WorkOrderNote {
  author?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
}

const buildAuthorName = (note: WorkOrderNoteWithAuthor) => {
  const first = note.author?.first_name ?? "";
  const last = note.author?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  if (full.length) return full;
  return "Team member";
};

export const useWorkOrderNotes = (workOrderId?: string | null) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<WorkOrderNoteWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!workOrderId) {
      setNotes([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("work_order_notes")
        .select(
          "*, author:profiles!work_order_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)",
        )
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setNotes((data ?? []) as WorkOrderNoteWithAuthor[]);
    } catch (err) {
      console.error("Failed to load work order notes", err);
      setError(err instanceof Error ? err.message : "Unable to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (input: { body: string; mentions?: string[] }) => {
      if (!profile?.org_id || !profile.id || !workOrderId) {
        throw new Error("Missing context for adding note");
      }

      const trimmed = input.body.trim();
      if (!trimmed.length) {
        throw new Error("Note body is required");
      }

      try {
        const { data, error: insertError } = await supabase
          .from("work_order_notes")
          .insert({
            org_id: profile.org_id,
            work_order_id: workOrderId,
            author_id: profile.id,
            body: trimmed,
            mentions: input.mentions?.length ? input.mentions : null,
          })
          .select(
            "*, author:profiles!work_order_notes_author_id_fkey(id, first_name, last_name, avatar_url, role)",
          )
          .single();

        if (insertError) {
          throw insertError;
        }

        const created = data as WorkOrderNoteWithAuthor;
        setNotes((current) => [created, ...current]);

        await supabase.rpc("log_work_order_activity", {
          p_work_order_id: workOrderId,
          p_action: "note.created",
          p_details: {
            noteId: created.id,
            mentions: input.mentions ?? [],
            preview: trimmed.slice(0, 140),
          },
        });

        if (input.mentions?.length) {
          const notificationRows = input.mentions
            .filter((userId) => userId !== profile.id)
            .map((userId) => ({
              org_id: profile.org_id,
              user_id: userId,
              title: "You were mentioned in a work order note",
              message: `${buildAuthorName(created)}: ${trimmed.slice(0, 120)}`,
              type: "work_order.note.mention",
              data: {
                workOrderId,
                noteId: created.id,
                authorId: profile.id,
              },
            }));

          if (notificationRows.length) {
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert(notificationRows);

            if (notificationError) {
              console.warn(
                "Unable to enqueue mention notifications",
                notificationError,
              );
            }
          }
        }

        toast({
          title: "Note added",
          description: "Your team can see the latest update immediately.",
        });

        return created;
      } catch (err) {
        console.error("Failed to add work order note", err);
        toast({
          title: "Unable to add note",
          description: "Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [profile?.org_id, profile?.id, workOrderId, toast],
  );

  const setPinned = useCallback(
    async (noteId: string, pinned: boolean) => {
      if (!workOrderId) return;

      const { error: updateError } = await supabase
        .from("work_order_notes")
        .update({ pinned })
        .eq("id", noteId);

      if (updateError) {
        console.error("Failed to update note pin state", updateError);
        toast({
          title: "Unable to update note",
          description: "Refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      setNotes((current) =>
        current.map((note) =>
          note.id === noteId
            ? ({
                ...note,
                pinned,
              } as WorkOrderNoteWithAuthor)
            : note,
        ),
      );
    },
    [workOrderId, toast],
  );

  return {
    notes,
    loading,
    error,
    addNote,
    setPinned,
    refresh: fetchNotes,
  };
};
