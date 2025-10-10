import { useMemo, useState } from "react";
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
import { AlertTriangle, MessageSquare, RefreshCcw } from "lucide-react";

export const ServiceDeskInbox = () => {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent">("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { threads, isLoading, refetch, unreadCount } = useChatThreads();
  const quickReplies = useMemo(
    () => [
      { label: "On it", body: "Thanks for flagging—I'm on it now and will update you shortly." },
      { label: "Need details", body: "Could you share a few more details so I can loop in the right technician?" },
      { label: "Ready for pickup", body: "Service is complete and the vehicle is ready for pickup once you sign off." },
    ],
    [],
  );

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
    return filteredThreads[0] ?? null;
  }, [filteredThreads, selectedThreadId]);

  const handleSelect = (threadId: string) => {
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
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
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
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-6 w-6" />
                <p>No conversations match your filters.</p>
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
        <CardHeader>
          <CardTitle className="text-base font-semibold">Conversation details</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(620px-72px)] p-0">
          {activeThread ? (
            <WorkOrderChat
              workOrderId={activeThread.work_order_id ?? undefined}
              defaultParticipants={activeThread.participants}
              className="h-full border-0"
              quickReplies={quickReplies}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              <p>Select a conversation to view details.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
