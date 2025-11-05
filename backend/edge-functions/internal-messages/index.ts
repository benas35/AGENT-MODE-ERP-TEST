import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.6";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for internal-messages edge function");
}

type AttachmentPayload = {
  storagePath: string;
  name: string;
  mimeType?: string;
  size?: number;
};

type SendPayload = {
  type?: "send" | "typing" | "read";
  orgId?: string;
  threadId?: string;
  workOrderId?: string | null;
  participants?: string[];
  senderId?: string;
  recipientId?: string | null;
  body?: string;
  priority?: "normal" | "urgent";
  attachments?: AttachmentPayload[];
  messageIds?: string[];
};

const normalizeAttachments = (attachments?: AttachmentPayload[]) => {
  if (!attachments?.length) return [];

  return attachments
    .filter((item) => typeof item.storagePath === "string" && item.storagePath.length > 2)
    .map((item) => ({
      storage_path: item.storagePath,
      name: item.name ?? "Attachment",
      mime_type: item.mimeType ?? null,
      size: item.size ?? null,
    }));
};

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const payload = (await req.json()) as SendPayload;
    const {
      type = "send",
      orgId,
      threadId,
      participants,
      senderId,
      recipientId = null,
      workOrderId = null,
      body,
      priority = "normal",
      attachments,
      messageIds,
    } = payload;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    if (type === "typing") {
      // Typing indicators are handled over realtime presence on the client side.
      return new Response(JSON.stringify({ status: "acknowledged" }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "read") {
      if (!orgId || !threadId || !senderId) {
        return new Response(JSON.stringify({ error: "Missing identifiers for read receipt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: count, error: markError } = await supabase.rpc("mark_internal_messages_read", {
        p_thread_id: threadId,
        p_message_ids: messageIds ?? null,
      });

      if (markError) {
        console.error("Failed to mark messages read", markError);
        return new Response(JSON.stringify({ error: "Unable to update read receipts" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ updated: count ?? 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orgId || !senderId || !body?.trim()) {
      return new Response(JSON.stringify({ error: "Message payload incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPriority = priority === "urgent" ? "urgent" : "normal";
    const attachmentRecords = normalizeAttachments(attachments);

    let resolvedThreadId = threadId ?? null;
    let threadParticipants: string[] = [];

    if (resolvedThreadId) {
      const { data: thread, error: threadError } = await supabase
        .from("message_threads")
        .select("id, org_id, participants, work_order_id")
        .eq("id", resolvedThreadId)
        .maybeSingle();

      if (threadError) {
        console.error("Failed to load thread", threadError);
        return new Response(JSON.stringify({ error: "Unable to load thread" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!thread) {
        return new Response(JSON.stringify({ error: "Thread not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (thread.org_id !== orgId) {
        return new Response(JSON.stringify({ error: "Thread does not belong to this organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      threadParticipants = thread.participants ?? [];
      if (thread.work_order_id && !workOrderId) {
        payload.workOrderId = thread.work_order_id;
      }
    } else {
      const incomingParticipants = unique([...(participants ?? []), senderId, recipientId ?? ""]);
      if (!incomingParticipants.includes(senderId)) {
        incomingParticipants.push(senderId);
      }

      if (!incomingParticipants.length) {
        return new Response(JSON.stringify({ error: "Participants are required for a new thread" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newThread, error: insertThreadError } = await supabase
        .from("message_threads")
        .insert({
          org_id: orgId,
          work_order_id: workOrderId,
          participants: incomingParticipants,
        })
        .select("id, participants")
        .single();

      if (insertThreadError) {
        console.error("Failed to create thread", insertThreadError);
        return new Response(JSON.stringify({ error: "Unable to create thread" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      resolvedThreadId = newThread.id;
      threadParticipants = newThread.participants ?? incomingParticipants;
    }

    if (!threadParticipants.includes(senderId)) {
      return new Response(JSON.stringify({ error: "Sender is not part of this thread" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: message, error: messageError } = await supabase
      .from("internal_messages")
      .insert({
        org_id: orgId,
        thread_id: resolvedThreadId!,
        sender_id: senderId,
        recipient_id: recipientId,
        work_order_id: workOrderId,
        body: body.trim(),
        priority: normalizedPriority,
        attachments: attachmentRecords.length ? attachmentRecords : null,
        read_at: new Date().toISOString(),
      })
      .select("id, created_at, priority, attachments, recipient_id, sender_id, body, work_order_id")
      .single();

    if (messageError) {
      console.error("Failed to insert message", messageError);
      return new Response(JSON.stringify({ error: "Unable to send message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateThreadError } = await supabase
      .from("message_threads")
      .update({ last_message_at: message.created_at })
      .eq("id", resolvedThreadId!);

    if (updateThreadError) {
      console.warn("Failed to update thread metadata", updateThreadError);
    }

    const notificationRecipients = (recipientId
      ? [recipientId]
      : threadParticipants.filter((participant) => participant !== senderId))
      .filter(Boolean);

    if (notificationRecipients.length) {
      const notificationRows = notificationRecipients.map((userId) => ({
        org_id: orgId,
        user_id: userId,
        title: normalizedPriority === "urgent" ? "Urgent workshop message" : "New workshop message",
        message: body.slice(0, 140),
        type: normalizedPriority === "urgent" ? "chat.internal.urgent" : "chat.internal",
        data: {
          threadId: resolvedThreadId,
          workOrderId,
          senderId,
          recipientId: userId,
          priority: normalizedPriority,
          attachments: message.attachments,
        },
      }));

      const { error: notificationError } = await supabase
        .from("notifications")
        .insert(notificationRows);

      if (notificationError) {
        console.warn("Failed to enqueue notifications", notificationError);
      }
    }

    return new Response(
      JSON.stringify({
        message,
        threadId: resolvedThreadId,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("internal-messages error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) {
  serve(handler);
}
