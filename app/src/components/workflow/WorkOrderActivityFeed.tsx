import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkOrderActivityEntry } from "@/hooks/useWorkOrderActivity";
import {
  ClipboardList,
  Clock3,
  MessageSquareText,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkOrderActivityFeedProps {
  activity: WorkOrderActivityEntry[];
  loading?: boolean;
}

const getActivityMeta = (entry: WorkOrderActivityEntry) => {
  const base = {
    icon: ClipboardList,
    label: "Activity",
    tone: "secondary" as const,
  };

  if (entry.action === "note.created") {
    return { icon: MessageSquareText, label: "Note added", tone: "secondary" as const };
  }
  if (entry.action === "approval.requested") {
    return { icon: ClipboardList, label: "Approval requested", tone: "default" as const };
  }
  if (entry.action === "approval.approved") {
    return { icon: ThumbsUp, label: "Customer approved", tone: "success" as const };
  }
  if (entry.action === "approval.declined") {
    return { icon: ThumbsDown, label: "Customer declined", tone: "destructive" as const };
  }
  if (entry.action === "time.logged") {
    return { icon: Clock3, label: "Time logged", tone: "outline" as const };
  }
  return base;
};

const toneClassMap: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-muted-foreground text-muted-foreground",
  default: "bg-primary/10 text-primary",
  secondary: "bg-muted text-muted-foreground",
};

export const WorkOrderActivityFeed = ({
  activity,
  loading = false,
}: WorkOrderActivityFeedProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={`activity-skeleton-${index}`} className="space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && activity.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Workflow actions, customer approvals, and technician updates will appear here in real time.
          </p>
        )}

        {!loading && activity.length > 0 && (
          <ul className="space-y-4">
            {activity.map((entry) => {
              const meta = getActivityMeta(entry);
              const Icon = meta.icon;
              const toneClass = toneClassMap[meta.tone] ?? toneClassMap.secondary;

              return (
                <li key={entry.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={toneClass + " inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      {entry.actor && (
                        <span className="text-sm text-muted-foreground">
                          {`${entry.actor.first_name ?? ""} ${entry.actor.last_name ?? ""}`.trim() || "System"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {entry.details && (
                    <div className="text-sm text-muted-foreground">
                      {entry.action === "note.created" && entry.details.preview && (
                        <p className="text-foreground">{String(entry.details.preview)}</p>
                      )}
                      {entry.action === "approval.requested" && (
                        <p>
                          Awaiting customer response
                          {entry.details.message && ` – ${String(entry.details.message)}`}
                        </p>
                      )}
                      {entry.action === "approval.approved" && (
                        <p>Customer approved the change.</p>
                      )}
                      {entry.action === "approval.declined" && (
                        <p>Customer declined the change.</p>
                      )}
                      {entry.action === "time.logged" && entry.details.minutes && (
                        <p>
                          {Number(entry.details.minutes)} minute{Number(entry.details.minutes) === 1 ? "" : "s"} recorded.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
