import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Send, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useChatThreads, useThreadMessages, ChatAttachment, SendMessagePayload } from "@/hooks/useInternalChat";
import { useWorkOrderMedia } from "@/hooks/useWorkOrderMedia";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface WorkOrderChatProps {
  workOrderId?: string;
  defaultParticipants?: string[];
  technicianId?: string | null;
  className?: string;
  quickReplies?: { label: string; body: string }[];
}

interface AttachmentSelectionProps {
  attachments: ChatAttachment[];
  onRemove: (storagePath: string) => void;
}

const AttachmentSelection = ({ attachments, onRemove }: AttachmentSelectionProps) => {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <Badge
          key={attachment.storage_path}
          className="flex items-center gap-2 bg-muted text-muted-foreground hover:bg-muted/70"
        >
          <Paperclip className="h-3 w-3" />
          <span className="max-w-[160px] truncate">{attachment.name}</span>
          <button
            type="button"
            className="text-xs font-semibold uppercase"
            onClick={() => onRemove(attachment.storage_path)}
          >
            remove
          </button>
        </Badge>
      ))}
    </div>
  );
};

export const WorkOrderChat = ({
  workOrderId,
  defaultParticipants = [],
  technicianId,
  className,
  quickReplies,
}: WorkOrderChatProps) => {
  const [message, setMessage] = useState("");
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachment[]>([]);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const { threads } = useChatThreads({ workOrderId });
  const activeThread = threads[0];
  const threadId = activeThread?.id;
  const { data, isLoading, isFetching, typingUsers, sendMessage, sending, setTyping } = useThreadMessages(threadId);
  const { media } = useWorkOrderMedia(workOrderId);

  const participants = useMemo(() => {
    const base = new Set(defaultParticipants);
    if (technicianId) {
      base.add(technicianId);
    }
    if (activeThread?.participants?.length) {
      activeThread.participants.forEach((participant) => base.add(participant));
    }
    return Array.from(base);
  }, [activeThread?.participants, defaultParticipants, technicianId]);

  const availableMedia = useMemo(() => media ?? [], [media]);

  const handleToggleAttachment = (storagePath: string, name: string) => {
    setSelectedAttachments((previous) => {
      const exists = previous.some((item) => item.storage_path === storagePath);
      if (exists) {
        return previous.filter((item) => item.storage_path !== storagePath);
      }
      return [
        ...previous,
        {
          storage_path: storagePath,
          name,
          mime_type: storagePath.endsWith(".webp") ? "image/webp" : undefined,
          size: undefined,
        },
      ];
    });
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const payload: SendMessagePayload = {
      threadId,
      workOrderId,
      body: message,
      attachments: selectedAttachments,
      participants,
    };

    await sendMessage(payload);
    setMessage("");
    setSelectedAttachments([]);
    setTyping(false);
  };

  const handleQuickReply = (body: string) => {
    setMessage((current) => {
      if (!current) return body;
      const separator = current.trim().length ? "\n\n" : "";
      return `${current}${separator}${body}`;
    });
    setTyping(true);
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const renderAttachments = (attachments: ChatAttachment[]) => {
    if (!attachments.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <Badge key={attachment.storage_path} className="bg-secondary text-secondary-foreground">
            <Paperclip className="mr-1 h-3 w-3" />
            {attachment.name}
          </Badge>
        ))}
      </div>
    );
  };

  const renderTyping = () => {
    if (!typingUsers.length) return null;
    const names = typingUsers.map((user) => user.name).join(", ");
    return <p className="mt-2 text-xs text-muted-foreground">{names} {typingUsers.length > 1 ? "are" : "is"} typing…</p>;
  };

  const isBusy = isLoading || isFetching;

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Internal chat</CardTitle>
        {activeThread?.last_message?.priority === "urgent" && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Urgent
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex-1 overflow-hidden rounded-md border">
          <ScrollArea className="h-full p-4">
            {isBusy && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chat…
              </div>
            )}

            {!isBusy && (data?.messages?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Paperclip className="h-8 w-8" />
                <p>No internal messages yet. Start the conversation for this work order.</p>
              </div>
            )}

            {data?.messages?.map((chatMessage) => {
              const sender = data.participants.find((participant) => participant.id === chatMessage.sender_id);
              const isUrgent = chatMessage.priority === "urgent";
              return (
                <div key={chatMessage.id} className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {sender?.displayName ?? "Team member"}
                        {isUrgent && (
                          <Badge variant="destructive" className="ml-2">URGENT</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(chatMessage.created_at), "PPpp")}
                      </p>
                    </div>
                    {chatMessage.read_at && (
                      <Badge variant="outline" className="text-xs">
                        Read
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {chatMessage.body}
                  </p>
                  {renderAttachments(chatMessage.attachments)}
                </div>
              );
            })}
            {renderTyping()}
          </ScrollArea>
        </div>

        <div className="space-y-3">
          <AttachmentSelection
            attachments={selectedAttachments}
          onRemove={(path) => setSelectedAttachments((previous) => previous.filter((item) => item.storage_path !== path))}
          />
          {quickReplies?.length ? (
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickReply(reply.body)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>
          ) : null}
          <Textarea
            ref={messageInputRef}
            value={message}
            onChange={(event) => {
              const value = event.target.value;
              setMessage(value);
              setTyping(value.trim().length > 0);
            }}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            rows={3}
            placeholder="Write an internal update…"
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                <Paperclip className="mr-1 h-4 w-4" /> Attach media
              </Button>
              <span className="text-xs text-muted-foreground">{selectedAttachments.length} attachment(s)</span>
            </div>
            <Button type="button" onClick={handleSend} disabled={!message.trim() || sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={isPickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Select work order media</DialogTitle>
          </DialogHeader>
          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
            {availableMedia.map((mediaItem) => (
              <div
                key={mediaItem.id}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <Checkbox
                  id={`media-${mediaItem.id}`}
                  checked={selectedAttachments.some((item) => item.storage_path === mediaItem.storage_path)}
                  onCheckedChange={() => handleToggleAttachment(mediaItem.storage_path, mediaItem.caption ?? mediaItem.category)}
                />
                <div className="flex-1 text-sm">
                  <label htmlFor={`media-${mediaItem.id}`} className="font-medium text-foreground">
                    {mediaItem.caption ?? mediaItem.category}
                  </label>
                  <p className="text-xs text-muted-foreground">{mediaItem.category.toUpperCase()} • {format(new Date(mediaItem.created_at), "PPpp")}</p>
                </div>
              </div>
            ))}
            {!availableMedia.length && (
              <p className="text-sm text-muted-foreground">No media available for this work order yet.</p>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Selected {selectedAttachments.length} attachment(s)</p>
            <Button type="button" onClick={() => setPickerOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
