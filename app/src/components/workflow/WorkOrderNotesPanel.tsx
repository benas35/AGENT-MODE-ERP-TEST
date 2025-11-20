import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MentionSelector } from "@/components/workflow/MentionSelector";
import { useWorkOrderNotes } from "@/hooks/useWorkOrderNotes";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { formatDistanceToNow } from "date-fns";
import { Pin, PinOff } from "lucide-react";

interface WorkOrderNotesPanelProps {
  workOrderId: string;
  onNoteAdded?: () => void;
}

export const WorkOrderNotesPanel = ({
  workOrderId,
  onNoteAdded,
}: WorkOrderNotesPanelProps) => {
  const { notes, loading, addNote, setPinned } = useWorkOrderNotes(workOrderId);
  const { members } = useOrgMembers();
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    try {
      setSubmitting(true);
      await addNote({ body: draft, mentions });
      setDraft("");
      setMentions([]);
      onNoteAdded?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Internal notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Capture quick updates, customer feedback, or technician observations."
            className="min-h-[96px]"
          />
          <MentionSelector
            value={mentions}
            onChange={setMentions}
            members={members}
            label="Notify teammates"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
            >
              {submitting ? "Saving..." : "Add note"}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={`note-skeleton-${index}`} className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && notes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No internal notes yet. Keep your team aligned by sharing context here.
            </p>
          )}

          {!loading && notes.length > 0 && (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {note.author?.first_name || note.author?.last_name
                        ? `${note.author?.first_name ?? ""} ${note.author?.last_name ?? ""}`.trim()
                        : "Team member"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPinned(note.id, !note.pinned)}
                        title={note.pinned ? "Unpin note" : "Pin note"}
                      >
                        {note.pinned ? (
                          <Pin className="h-4 w-4" />
                        ) : (
                          <PinOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {note.body}
                  </p>

                  {note.mentions && note.mentions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.mentions.map((mention) => (
                        <Badge key={`${note.id}-${mention}`} variant="outline">
                          {members.find((member) => member.id === mention)?.displayName ||
                            "Team member"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
