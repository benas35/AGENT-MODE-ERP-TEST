import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createUndoDeferred,
  isUndoError,
  registerUndo,
  type UndoDeferred,
  type UndoHandle,
  UndoCancelledError,
} from "@/lib/undo";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";

export type MessagePriority = "normal" | "urgent";

export interface ChatAttachment {
  storage_path: string;
  name: string;
  mime_type?: string | null;
  size?: number | null;
}

export interface InternalMessage {
  id: string;
  body: string;
  created_at: string;
  priority: MessagePriority;
  attachments: ChatAttachment[];
  sender_id: string;
  recipient_id: string | null;
  read_at: string | null;
  work_order_id: string | null;
}

export interface ChatParticipant {
  id: string;
  displayName: string;
  avatar_url: string | null;
  role: string | null;
}

export interface ChatThread {
  id: string;
  work_order_id: string | null;
  participants: string[];
  last_message_at: string;
  last_message?: InternalMessage | null;
  unread_count: number;
}

export interface SendMessagePayload {
  threadId?: string;
  workOrderId?: string | null;
  body: string;
  priority?: MessagePriority;
  attachments?: ChatAttachment[];
  recipientId?: string | null;
  participants?: string[];
}

export interface TypingUser {
  userId: string;
  name: string;
  updatedAt: string;
}

const threadListKey = (userId?: string, filters?: Record<string, unknown>) => ["chat-threads", userId, filters];
const threadMessagesKey = (threadId?: string) => ["chat-thread", threadId];

type ThreadMutationContext = {
  previous?: ChatThread[];
  undoHandle?: UndoHandle;
};

interface ArchiveVariables {
  threadId: string;
  deferred: UndoDeferred;
}

type DeleteMessageContext = {
  previousMessages?: { messages: InternalMessage[]; participants: ChatParticipant[] };
  previousThreads?: ChatThread[];
  undoHandle?: UndoHandle;
};

interface DeleteMessageVariables {
  message: InternalMessage;
  threadId: string;
  deferred: UndoDeferred;
}

export const normalizeAttachments = (value: any): ChatAttachment[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && typeof item.storage_path === "string")
      .map((item) => ({
        storage_path: item.storage_path,
        name: item.name ?? "Attachment",
        mime_type: item.mime_type ?? null,
        size: typeof item.size === "number" ? item.size : null,
      }));
  }
  return [];
};

const buildDisplayName = (participant?: { first_name?: string | null; last_name?: string | null; email?: string | null }) => {
  if (!participant) return "";
  const full = [participant.first_name, participant.last_name].filter(Boolean).join(" ");
  if (full) return full;
  return participant.email ?? "Unknown";
};

export const useChatThreads = (filters?: { workOrderId?: string | null; priority?: MessagePriority | "all" }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, ...rest } = useQuery({
    queryKey: threadListKey(profile?.id, filters),
    enabled: Boolean(profile?.id),
    queryFn: async (): Promise<ChatThread[]> => {
      if (!profile?.id) return [];

      let query = supabase
        .from("message_threads")
        .select(
          `id, org_id, work_order_id, participants, last_message_at,
          internal_messages!internal_messages_thread_id_fkey (id, body, priority, attachments, sender_id, recipient_id, created_at, read_at, work_order_id)`
        )
        .contains("participants", [profile.id])
        .order("last_message_at", { ascending: false })
        .limit(50);

      query = query.limit(1, { foreignTable: "internal_messages" });
      query = query.is("archived_at", null);

      if (filters?.workOrderId) {
        query = query.eq("work_order_id", filters.workOrderId);
      }

      const { data: threads, error } = await query;

      if (error) {
        throw error;
      }

      return (threads ?? []).map<ChatThread>((thread) => {
        const last = thread.internal_messages?.[0] ?? null;
        const lastMessage = last
          ? {
              id: last.id,
              body: last.body,
              created_at: last.created_at,
              priority: (last.priority as MessagePriority) ?? "normal",
              attachments: normalizeAttachments(last.attachments),
              sender_id: last.sender_id,
              recipient_id: last.recipient_id,
              read_at: last.read_at,
              work_order_id: last.work_order_id,
            }
          : null;

        return {
          id: thread.id,
          work_order_id: thread.work_order_id,
          participants: thread.participants ?? [],
          last_message_at: thread.last_message_at,
          last_message: lastMessage,
          unread_count: 0,
        };
      });
    },
  });

  const unreadTotalQuery = useQuery({
    queryKey: ["chat-unread-count", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data: count, error } = await supabase.rpc("internal_message_unread_count");
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
  });

  const unreadByThreadQuery = useQuery({
    queryKey: ["chat-unread-by-thread", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("internal_message_unread_counts");
      if (error) {
        throw error;
      }
      return (rows ?? []) as { thread_id: string; unread: number }[];
    },
  });

  const unreadLookup = useMemo(() => {
    const map = new Map<string, number>();
    (unreadByThreadQuery.data ?? []).forEach((row) => {
      if (row.thread_id) {
        map.set(row.thread_id, row.unread ?? 0);
      }
    });
    return map;
  }, [unreadByThreadQuery.data]);

  const threadsWithUnread = useMemo(() => {
    return (data ?? []).map((thread) => ({
      ...thread,
      unread_count: unreadLookup.get(thread.id) ?? thread.unread_count,
    }));
  }, [data, unreadLookup]);

  const archiveMutation = useMutation<void, unknown, ArchiveVariables, ThreadMutationContext>({
    mutationFn: async ({ threadId, deferred }) => {
      try {
        await deferred.promise;
      } catch (error) {
        if (isUndoError(error)) {
          throw error;
        }
        throw error;
      }

      const { error } = await supabase
        .from("message_threads")
        .update({ archived_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", threadId);

      if (error) {
        throw error;
      }
    },
    onMutate: async ({ threadId, deferred }) => {
      const listKey = threadListKey(profile?.id, filters);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ChatThread[]>(listKey);
      queryClient.setQueryData<ChatThread[]>(listKey, (old = []) => old.filter((thread) => thread.id !== threadId));

      const undoHandle = registerUndo({
        label: "Thread archived",
        description: "Undo within 5 seconds to restore this conversation.",
        ttlMs: 5000,
        do: () => {
          deferred.resolve();
        },
        undo: async () => {
          deferred.reject(new UndoCancelledError());
          if (previous) {
            queryClient.setQueryData(listKey, previous);
          }
        },
      });

      return { previous, undoHandle };
    },
    onError: (error, _variables, context) => {
      context?.undoHandle?.dispose();

      if (isUndoError(error)) {
        return;
      }

      if (context?.previous) {
        queryClient.setQueryData(threadListKey(profile?.id, filters), context.previous);
      }

      const friendly = mapErrorToFriendlyMessage(error, "archiving the thread");
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: "destructive",
      });
    },
    onSettled: async (_data, error, _variables, context) => {
      context?.undoHandle?.dispose();
      if (!error || !isUndoError(error)) {
        const invalidations: Promise<unknown>[] = [];
        invalidations.push(queryClient.invalidateQueries({ queryKey: ["chat-threads", profile?.id] }));
        if (profile?.id) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile.id] }));
          invalidations.push(queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile.id] }));
        }
        await Promise.all(invalidations);
      }
    },
  });

  const archiveThread = useCallback(
    async (threadId: string) => {
      if (!threadId) return;
      const deferred = createUndoDeferred();
      deferred.promise.catch(() => undefined);
      archiveMutation.mutate({ threadId, deferred });
    },
    [archiveMutation],
  );

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`internal-messages-threads-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "internal_messages" },
        (payload) => {
          const message = payload.new as any;
          if (!message.thread_id) return;
          queryClient.invalidateQueries({ queryKey: threadListKey(profile.id, filters) });
          queryClient.invalidateQueries({ queryKey: threadMessagesKey(message.thread_id) });
          queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "internal_messages" },
        (payload) => {
          const message = payload.new as any;
          if (!message.thread_id) return;
          queryClient.invalidateQueries({ queryKey: threadMessagesKey(message.thread_id) });
          queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile.id] });
          queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters, profile?.id, queryClient]);

  return {
    threads: threadsWithUnread,
    unreadCount: unreadTotalQuery.data ?? 0,
    unreadLoading: unreadTotalQuery.isLoading,
    unreadByThread: unreadByThreadQuery.data ?? [],
    unreadByThreadLoading: unreadByThreadQuery.isLoading,
    archiveThread,
    isArchiving: archiveMutation.isPending,
    ...rest,
  };
};

export const useThreadMessages = (threadId?: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const presenceChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingState = useRef(false);

  const messageQuery = useQuery({
    queryKey: threadMessagesKey(threadId),
    enabled: Boolean(profile?.id && threadId),
    queryFn: async (): Promise<{ messages: InternalMessage[]; participants: ChatParticipant[] }> => {
      if (!profile?.id || !threadId) return { messages: [], participants: [] };

      const [{ data: thread, error: threadError }, { data: messages, error: messageError }] = await Promise.all([
        supabase
          .from("message_threads")
          .select("participants, work_order_id")
          .eq("id", threadId)
          .maybeSingle(),
        supabase
          .from("internal_messages")
          .select("id, body, created_at, priority, attachments, sender_id, recipient_id, read_at, work_order_id")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true }),
      ]);

      if (threadError) throw threadError;
      if (messageError) throw messageError;

      const participantIds = thread?.participants ?? [];
      const { data: participantProfiles } = participantIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name, email, avatar_url, role")
            .in("id", participantIds)
        : { data: [] as any[] };

      const participants: ChatParticipant[] = (participantProfiles ?? []).map((participant) => ({
        id: participant.id,
        displayName: buildDisplayName(participant),
        avatar_url: participant.avatar_url ?? null,
        role: participant.role ?? null,
      }));

      const mappedMessages: InternalMessage[] = (messages ?? []).map((message) => ({
        id: message.id,
        body: message.body,
        created_at: message.created_at,
        priority: (message.priority as MessagePriority) ?? "normal",
        attachments: normalizeAttachments(message.attachments),
        sender_id: message.sender_id,
        recipient_id: message.recipient_id,
        read_at: message.read_at,
        work_order_id: message.work_order_id,
      }));

      return { messages: mappedMessages, participants };
    },
  });

  const deleteMessageMutation = useMutation<void, unknown, DeleteMessageVariables, DeleteMessageContext>({
    mutationFn: async ({ message, deferred }) => {
      try {
        await deferred.promise;
      } catch (error) {
        if (isUndoError(error)) {
          throw error;
        }
        throw error;
      }

      const { error } = await supabase
        .from("internal_messages")
        .delete()
        .eq("id", message.id);

      if (error) {
        throw error;
      }
    },
    onMutate: async ({ message, threadId: activeThreadId, deferred }) => {
      if (!activeThreadId) {
        deferred.resolve();
        return { previousMessages: undefined, previousThreads: undefined, undoHandle: undefined };
      }

      await queryClient.cancelQueries({ queryKey: threadMessagesKey(activeThreadId) });
      const previousMessages = queryClient.getQueryData<{ messages: InternalMessage[]; participants: ChatParticipant[] }>(
        threadMessagesKey(activeThreadId),
      );
      queryClient.setQueryData(threadMessagesKey(activeThreadId), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((item) => item.id !== message.id),
        };
      });

      const listKey = threadListKey(profile?.id);
      const previousThreads = queryClient.getQueryData<ChatThread[]>(listKey);
      if (previousThreads) {
        const filteredMessages = (previousMessages?.messages ?? []).filter((item) => item.id !== message.id);
        const nextLast = filteredMessages[filteredMessages.length - 1] ?? null;
        queryClient.setQueryData<ChatThread[]>(listKey, (threads = []) =>
          threads.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  last_message: nextLast ?? null,
                  last_message_at: nextLast?.created_at ?? thread.last_message_at,
                }
              : thread,
          ),
        );
      }

      const undoHandle = registerUndo({
        label: "Message deleted",
        description: "Undo within 5 seconds to restore this message.",
        ttlMs: 5000,
        do: () => {
          deferred.resolve();
        },
        undo: async () => {
          deferred.reject(new UndoCancelledError());
          if (previousMessages) {
            queryClient.setQueryData(threadMessagesKey(activeThreadId), previousMessages);
          }
          if (previousThreads) {
            queryClient.setQueryData(listKey, previousThreads);
          }
        },
      });

      return { previousMessages, previousThreads, undoHandle };
    },
    onError: (error, variables, context) => {
      context?.undoHandle?.dispose();

      if (isUndoError(error)) {
        return;
      }

      if (context?.previousMessages && variables.threadId) {
        queryClient.setQueryData(threadMessagesKey(variables.threadId), context.previousMessages);
      }

      if (context?.previousThreads) {
        queryClient.setQueryData(threadListKey(profile?.id), context.previousThreads);
      }

      const friendly = mapErrorToFriendlyMessage(error, "deleting the message");
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: "destructive",
      });
    },
    onSettled: async (_data, error, variables, context) => {
      context?.undoHandle?.dispose();
      if (!variables.threadId) return;

      if (!error || !isUndoError(error)) {
        const invalidations: Promise<unknown>[] = [
          queryClient.invalidateQueries({ queryKey: threadMessagesKey(variables.threadId) }),
          queryClient.invalidateQueries({ queryKey: ["chat-threads", profile?.id] }),
        ];
        if (profile?.id) {
          invalidations.push(queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile.id] }));
          invalidations.push(queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile.id] }));
        }
        await Promise.all(invalidations);
      }
    },
  });

  useEffect(() => {
    if (!profile?.id || !threadId) return;

    const unreadMessageIds = (messageQuery.data?.messages ?? [])
      .filter((message) => !message.read_at && message.sender_id !== profile.id)
      .map((message) => message.id);

    if (!unreadMessageIds.length) return;

    supabase
      .functions
      .invoke("internal-messages", {
        body: JSON.stringify({
          type: "read",
          orgId: profile.org_id,
          threadId,
          senderId: profile.id,
          messageIds: unreadMessageIds,
        }),
      })
      .catch((error) => {
        console.error("Failed to mark messages read", error);
      })
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: threadListKey(profile.id) });
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile.id] });
        queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile.id] });
      });
  }, [messageQuery.data?.messages, profile?.id, profile?.org_id, queryClient, threadId]);

  useEffect(() => {
    if (!profile?.id || !threadId) return;

    const channel = supabase.channel(`internal-thread-${threadId}`, {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const active: TypingUser[] = [];
        Object.entries(state).forEach(([key, entries]) => {
          entries.forEach((entry: any) => {
            if (entry.typing && key !== profile.id) {
              active.push({
                userId: key,
                name: entry.name,
                updatedAt: entry.updatedAt,
              });
            }
          });
        });
        setTypingUsers(active);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            typing: false,
            name: profile.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : profile.id,
            updatedAt: new Date().toISOString(),
          });
        }
      });

    presenceChannel.current = channel;

    return () => {
      if (presenceChannel.current) {
        supabase.removeChannel(presenceChannel.current);
        presenceChannel.current = null;
      }
    };
  }, [profile?.first_name, profile?.id, profile?.last_name, threadId]);

  const setTyping = useCallback(
    (value: boolean) => {
      if (!presenceChannel.current || !profile?.id || typingState.current === value) return;
      typingState.current = value;
      presenceChannel.current.track({
        typing: value,
        name: profile.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : profile.id,
        updatedAt: new Date().toISOString(),
      }).catch((error) => {
        console.warn("Failed to publish typing state", error);
      });
    },
    [profile?.first_name, profile?.id, profile?.last_name],
  );

  const sendMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      if (!profile?.org_id || !profile?.id) {
        throw new Error("Missing user context");
      }

      const requestBody = {
        type: "send",
        orgId: profile.org_id,
        senderId: profile.id,
        threadId: payload.threadId,
        workOrderId: payload.workOrderId,
        body: payload.body,
        priority: payload.priority ?? "normal",
        attachments: payload.attachments?.map((attachment) => ({
          storagePath: attachment.storage_path,
          name: attachment.name,
          mimeType: attachment.mime_type ?? undefined,
          size: attachment.size ?? undefined,
        })),
        recipientId: payload.recipientId,
        participants: payload.participants,
      } satisfies SendMessagePayload & { orgId: string; senderId: string };

      const { data, error } = await supabase.functions.invoke("internal-messages", {
        body: JSON.stringify(requestBody),
      });

      if (error) {
        throw new Error(error.message ?? "Unable to send message");
      }

      return data as { message: InternalMessage; threadId: string };
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: threadMessagesKey(response.threadId) }),
        queryClient.invalidateQueries({ queryKey: threadListKey(profile?.id) }),
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count", profile?.id] }),
        queryClient.invalidateQueries({ queryKey: ["chat-unread-by-thread", profile?.id] }),
      ]);
      typingState.current = false;
      if (presenceChannel.current) {
        presenceChannel.current.track({
          typing: false,
          name: profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : profile?.id,
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMessage = useCallback(
    async (message: InternalMessage) => {
      if (!threadId) return;
      const deferred = createUndoDeferred();
      deferred.promise.catch(() => undefined);
      deleteMessageMutation.mutate({ message, threadId, deferred });
    },
    [deleteMessageMutation, threadId],
  );

  return {
    ...messageQuery,
    typingUsers,
    setTyping,
    sendMessage: sendMutation.mutateAsync,
    sending: sendMutation.isPending,
    deleteMessage,
    isDeletingMessage: deleteMessageMutation.isPending,
  };
};
