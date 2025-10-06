import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkOrderMediaCategory, WorkOrderMediaItem } from "@/hooks/useWorkOrderMedia";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Camera, Download, FileText, Images, Pencil, Trash2, Triangle } from "lucide-react";
import { WorkOrderPhotoReport } from "./WorkOrderPhotoReport";
import { findBeforeAfterPair, formatGps } from "./utils/media";

const categoryLabels: Record<WorkOrderMediaCategory, { label: string; tone: string }> = {
  before: { label: "Before", tone: "bg-sky-500/10 text-sky-700" },
  after: { label: "After", tone: "bg-emerald-500/10 text-emerald-700" },
  issue: { label: "Issue", tone: "bg-amber-500/10 text-amber-700" },
  damage: { label: "Damage", tone: "bg-rose-500/10 text-rose-700" },
  progress: { label: "Progress", tone: "bg-indigo-500/10 text-indigo-700" },
};

const categories: (WorkOrderMediaCategory | "all")[] = ["all", "issue", "progress", "before", "after", "damage"];

interface WorkOrderPhotoTimelineProps {
  workOrderId: string;
  media: WorkOrderMediaItem[];
  isLoading?: boolean;
  onDelete: (item: WorkOrderMediaItem) => Promise<unknown>;
  onUpdateCategory: (payload: { id: string; category: WorkOrderMediaCategory }) => Promise<unknown>;
  onUpdateCaption: (payload: { id: string; caption: string | null }) => Promise<unknown>;
}

const BeforeAfterCompare = ({ before, after }: { before: WorkOrderMediaItem; after: WorkOrderMediaItem }) => {
  const [position, setPosition] = useState(50);

  return (
    <Card className="overflow-hidden border-primary/40">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <Images className="h-4 w-4" /> Before / After compare
        </CardTitle>
        <CardDescription>Slide to compare the documented repair results.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
          <img src={before.url} alt={before.caption ?? "Before photo"} className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0 h-full"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <img src={after.url} alt={after.caption ?? "After photo"} className="h-full w-full object-cover" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-[var(--slider)] w-0.5 bg-white/60 shadow-lg" style={{
            left: `${position}%`,
          }} />
          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="absolute inset-x-6 bottom-4"
          />
          <div className="absolute left-4 top-4 flex flex-col gap-1">
            <Badge className="bg-black/70 text-white">Before</Badge>
            {before.caption && <span className="text-xs text-white drop-shadow">{before.caption}</span>}
          </div>
          <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
            <Badge className="bg-emerald-600 text-white">After</Badge>
            {after.caption && <span className="text-xs text-white drop-shadow text-right">{after.caption}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const WorkOrderPhotoTimeline: React.FC<WorkOrderPhotoTimelineProps> = ({
  workOrderId,
  media,
  isLoading,
  onDelete,
  onUpdateCategory,
  onUpdateCaption,
}) => {
  const [filter, setFilter] = useState<(typeof categories)[number]>("all");
  const [captionDialog, setCaptionDialog] = useState<{ id: string; caption: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return media;
    return media.filter((item) => item.category === filter);
  }, [filter, media]);

  const pair = findBeforeAfterPair(media);

  const handleCaptionSave = async () => {
    if (!captionDialog) return;
    await onUpdateCaption({ id: captionDialog.id, caption: captionDialog.caption.trim() ? captionDialog.caption.trim() : null });
    setCaptionDialog(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Photo timeline
            </CardTitle>
            <CardDescription>
              Every upload is tracked chronologically. Tap an entry for actions, approvals and exports.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <WorkOrderPhotoReport workOrderId={workOrderId} media={media} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" /> Print summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <ScrollArea className="w-full">
              <TabsList className="inline-flex min-w-full justify-start">
                {categories.map((categoryKey) => (
                  <TabsTrigger key={categoryKey} value={categoryKey} className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{categoryKey === "all" ? "All" : categoryKey}</span>
                    <Badge variant="secondary">
                      {categoryKey === "all"
                        ? media.length
                        : media.filter((item) => item.category === categoryKey).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            <TabsContent value={filter} className="mt-6 space-y-4">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-40 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {!isLoading && !filtered.length && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                  <Camera className="h-10 w-10" />
                  <p className="text-sm font-medium">No photos in this view yet</p>
                  <p className="text-xs max-w-md">
                    Snap a photo from the technician app or upload from the desktop workflow to capture progress and issues.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {filtered.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
                      <div className="relative">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.caption ?? `Work order photo ${item.id}`}
                          className="h-full w-full object-cover"
                        />
                        <Badge
                          className={cn(
                            "absolute left-4 top-4",
                            categoryLabels[item.category].tone,
                          )}
                        >
                          {categoryLabels[item.category].label}
                        </Badge>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold">
                              {item.caption || "Untitled photo"}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Triangle className="h-3 w-3 rotate-90" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Photo actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setCaptionDialog({ id: item.id, caption: item.caption ?? "" })}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit caption
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {Object.entries(categoryLabels).map(([value, meta]) => (
                                  <DropdownMenuItem
                                    key={value}
                                    onClick={() => onUpdateCategory({ id: item.id, category: value as WorkOrderMediaCategory })}
                                  >
                                    <Badge className={cn("mr-2", meta.tone)}>{meta.label}</Badge>
                                    Set as {meta.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center">
                                    <Download className="mr-2 h-4 w-4" /> Download
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                          {item.uploaded_by_name && <span>By {item.uploaded_by_name}</span>}
                          {(() => {
                            const gpsLabel = formatGps(item.gps);
                            return gpsLabel ? <span>GPS {gpsLabel}</span> : null;
                          })()}
                        </div>
                        </div>

                        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                          <div className="font-medium text-foreground text-sm">Shared URL</div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-primary hover:underline"
                          >
                            {item.url}
                          </a>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes the media file and its annotations from the work order.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(item)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {pair && <BeforeAfterCompare before={pair.before} after={pair.after} />}

      <Dialog open={Boolean(captionDialog)} onOpenChange={(open) => !open && setCaptionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update caption</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={captionDialog?.caption ?? ""}
            onChange={(event) =>
              setCaptionDialog((previous) => (previous ? { ...previous, caption: event.target.value } : previous))
            }
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCaptionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleCaptionSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
