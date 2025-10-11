import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChatThreads } from "@/hooks/useInternalChat";
import { WorkOrderChat } from "@/features/chat/WorkOrderChat";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Archive, Loader2, MessageSquare, RefreshCcw, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { safeSubmit, schemaResolver, stringNonEmpty, z } from "@/lib/validation";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import inboxEmpty from "@/assets/empties/inbox.svg";

const cryptoRandomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const ServiceDeskInbox = () => {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent">("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const { threads, isLoading, refetch, unreadCount, archiveThread, isArchiving } = useChatThreads();
  type QuickReplyTemplate = { id: string; label: string; body: string };
  const [quickReplies, setQuickReplies] = useState<QuickReplyTemplate[]>(() => [
    {
      id: cryptoRandomId(),
      label: "On it",
      body: "Thanks for flagging—I'm on it now and will update you shortly.",
    },
    {
      id: cryptoRandomId(),
      label: "Need details",
      body: "Could you share a few more details so I can loop in the right technician?",
    },
    {
      id: cryptoRandomId(),
      label: "Ready for pickup",
      body: "Service is complete and the vehicle is ready for pickup once you sign off.",
    },
  ]);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplate | null>(null);
  const [threadToArchive, setThreadToArchive] = useState<string | null>(null);

  const templateSchema = useMemo(
    () =>
      z.object({
        label: stringNonEmpty("Label is required").max(40, "Use 40 characters or fewer for labels"),
        body: stringNonEmpty("Message is required").max(500, "Keep quick replies under 500 characters"),
      }),
    [],
  );

  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: schemaResolver(templateSchema),
    defaultValues: { label: "", body: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (!manageTemplatesOpen) {
      templateForm.reset({ label: "", body: "" });
      templateForm.clearErrors();
      setEditingTemplate(null);
      return;
    }

    const target = editingTemplate ?? quickReplies[0] ?? null;
    if (target) {
      templateForm.reset({ label: target.label, body: target.body });
      setEditingTemplate(target);
    } else {
      templateForm.reset({ label: "", body: "" });
    }
    templateForm.clearErrors();
  }, [manageTemplatesOpen, editingTemplate, quickReplies, templateForm]);

  const handleTemplateSubmit = templateForm.handleSubmit(
    safeSubmit(async (values) => {
      const id = editingTemplate?.id ?? cryptoRandomId();
      const nextTemplate: QuickReplyTemplate = { id, label: values.label, body: values.body };
      setQuickReplies((previous) => {
        const exists = previous.some((template) => template.id === id);
        if (exists) {
          return previous.map((template) => (template.id === id ? nextTemplate : template));
        }
        return [...previous, nextTemplate];
      });
      setEditingTemplate(nextTemplate);
      setManageTemplatesOpen(false);
    }),
  );

  const handleTemplateDelete = () => {
    if (!editingTemplate) return;
    setQuickReplies((previous) => previous.filter((template) => template.id !== editingTemplate.id));
    setEditingTemplate(null);
    templateForm.reset({ label: "", body: "" });
  };

  const filteredThreads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (threads ?? []).filter((thread) => {
      if (priorityFilter === "urgent" && thread.last_message?.priority !== "urgent") {
        return false;
      }

      if (!normalizedSearch) return true;

      const matchesBody = thread.last_message?.body?.toLowerCase().includes(normalizedSearch);
      const matchesWorkOrder = thread.work_order_id?.toLowerCase().includes(normalizedSearch);
      return matchesBody || matchesWorkOrder;
    });
  }, [threads, search, priorityFilter]);

  const activeThread = useMemo(() => {
    if (selectedThreadId) {
      return filteredThreads.find((thread) => thread.id === selectedThreadId) ?? null;
    }
    if (isComposing) {
      return null;
    }
    return filteredThreads[0] ?? null;
  }, [filteredThreads, isComposing, selectedThreadId]);

  const handleSelect = (threadId: string) => {
    setIsComposing(false);
    setSelectedThreadId(threadId);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="h-[620px] overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4" /> Inbox
              {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!activeThread) return;
                  setThreadToArchive(activeThread.id);
                }}
                disabled={!activeThread || isArchiving}
                aria-label="Archive conversation"
              >
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages or work orders"
          />
          <Select value={priorityFilter} onValueChange={(value: "all" | "urgent") => setPriorityFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent only</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(620px-200px)]">
            {!filteredThreads.length && (
              <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 text-center text-muted-foreground">
                <img src={inboxEmpty} alt="" aria-hidden="true" className="h-28 w-auto" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground">
                    Keep teams aligned by starting the first internal thread or clearing filters to reveal archived chats.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setPriorityFilter("all");
                    setSelectedThreadId(null);
                    setIsComposing(true);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Create first thread
                </Button>
              </div>
            )}
            <ul className="space-y-1 p-2">
              {filteredThreads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-2 rounded-md border px-3 py-2 text-left transition",
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted",
                      )}
                      onClick={() => handleSelect(thread.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {thread.work_order_id ? `WO ${thread.work_order_id}` : "General"}
                          {thread.last_message?.priority === "urgent" && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Urgent
                            </Badge>
                          )}
                          {thread.unread_count > 0 && (
                            <Badge variant="outline" className="ml-1 bg-background">
                              {thread.unread_count > 9 ? "9+" : thread.unread_count}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {thread.last_message_at
                            ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {thread.last_message?.body ?? "No messages yet"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="h-[620px] overflow-hidden">
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Conversation details</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManageTemplatesOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Settings className="mr-2 h-4 w-4" /> Manage quick replies
          </Button>
        </CardHeader>
        <CardContent className="h-[calc(620px-72px)] p-0">
          {activeThread ? (
            <WorkOrderChat
              workOrderId={activeThread.work_order_id ?? undefined}
              defaultParticipants={activeThread.participants}
              className="h-full border-0"
              quickReplies={quickReplies.map(({ label, body }) => ({ label, body }))}
              threadId={activeThread.id}
              onMessageSent={() => setIsComposing(false)}
            />
          ) : isComposing ? (
            <WorkOrderChat
              key="compose-new-thread"
              className="h-full border-0"
              quickReplies={quickReplies.map(({ label, body }) => ({ label, body }))}
              composeMode
              onMessageSent={() => setIsComposing(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-sm text-muted-foreground">
              <img src={inboxEmpty} alt="" aria-hidden="true" className="h-32 w-auto" />
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold text-foreground">Select a conversation</p>
                <p className="text-xs text-muted-foreground">
                  Choose a thread from the inbox or start a new conversation with advisors and technicians.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsComposing(true)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Start conversation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setManageTemplatesOpen(true)}
        className="sm:hidden"
      >
        <Settings className="mr-2 h-4 w-4" /> Manage quick replies
      </Button>

      <Dialog open={manageTemplatesOpen} onOpenChange={setManageTemplatesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick reply templates</DialogTitle>
            <DialogDescription>
              Maintain shared responses so advisors can respond consistently and quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingTemplate(null);
                  templateForm.reset({ label: "", body: "" });
                }}
              >
                New template
              </Button>
              <div className="space-y-2" role="list">
                {quickReplies.length ? (
                  quickReplies.map((template) => (
                    <Button
                      key={template.id}
                      type="button"
                      variant={editingTemplate?.id === template.id ? "outline" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setEditingTemplate(template);
                        templateForm.reset({ label: template.label, body: template.body });
                      }}
                    >
                      {template.label}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No quick replies yet. Create one to get started.</p>
                )}
              </div>
            </div>
            <Form {...templateForm}>
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <FormField
                  control={templateForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button label</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ready for pickup" autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="body"
                  render={({ field }) => {
                    const length = field.value?.length ?? 0;
                    return (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={6}
                            placeholder="Service is complete and the vehicle is ready for pickup once you sign off."
                          />
                        </FormControl>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <FormMessage />
                          <span>{length}/500</span>
                        </div>
                      </FormItem>
                    );
                  }}
                />
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {editingTemplate ? (
                    <Button type="button" variant="ghost" onClick={handleTemplateDelete}>
                      Remove template
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Templates are shared across the service desk.</span>
                  )}
                  <Button
                    type="submit"
                    disabled={!templateForm.formState.isValid || templateForm.formState.isSubmitting}
                  >
                    Save template
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(threadToArchive)}
        onOpenChange={(open) => {
          if (!open) {
            setThreadToArchive(null);
          }
        }}
        title="Archive this conversation?"
        description="Archived threads disappear from the inbox until a new message arrives."
        confirmText="Archive thread"
        preferenceKey="chat.thread.archive"
        loading={isArchiving}
        onConfirm={async () => {
          if (!threadToArchive) return;
          await archiveThread(threadToArchive);
          if (selectedThreadId === threadToArchive) {
            setSelectedThreadId(null);
          }
          setThreadToArchive(null);
        }}
      />
    </div>
  );
};
