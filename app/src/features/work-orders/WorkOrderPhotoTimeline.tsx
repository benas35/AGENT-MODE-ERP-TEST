import { useEffect, useMemo, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  WorkOrderMediaCategory,
  WorkOrderMediaItem,
  WorkOrderUploadQueueItem,
} from "@/hooks/useWorkOrderMedia";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Camera, Download, FileText, Images, Loader2, Pencil, RotateCcw, Trash2, Triangle, X } from "lucide-react";
import { WorkOrderPhotoReport } from "./WorkOrderPhotoReport";
import { findBeforeAfterPair, formatGps } from "./utils/media";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { useForm } from "react-hook-form";
import { mediaCaptionSchema, type MediaCaptionFormValues } from "@/features/vehicle-media/captionSchema";
import { safeSubmit, schemaResolver } from "@/lib/validation";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";
import timelineEmpty from "@/assets/empties/timeline.svg";

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
  pendingUploads?: WorkOrderUploadQueueItem[];
  onCancelUpload?: (id: string) => void;
  onRetryUpload?: (id: string) => void;
  onDismissUpload?: (id: string) => void;
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
  pendingUploads = [],
  onCancelUpload,
  onRetryUpload,
  onDismissUpload,
}) => {
  const [filter, setFilter] = useState<(typeof categories)[number]>("all");
  const [captionDialog, setCaptionDialog] = useState<{ id: string; caption: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkOrderMediaItem | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const captionForm = useForm<MediaCaptionFormValues>({
    resolver: schemaResolver(mediaCaptionSchema),
    defaultValues: { caption: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (captionDialog) {
      captionForm.reset({ caption: captionDialog.caption ?? "" });
      captionForm.clearErrors();
    }
  }, [captionDialog, captionForm]);

  const filtered = useMemo(() => {
    if (filter === "all") return media;
    return media.filter((item) => item.category === filter);
  }, [filter, media]);

  const pair = findBeforeAfterPair(media);

  const activeUploads = useMemo(
    () => pendingUploads.filter((item) => item.status !== "success"),
    [pendingUploads],
  );

  const uploadStatusLabel: Record<WorkOrderUploadQueueItem["status"], string> = {
    queued: "Queued",
    uploading: "Uploading",
    success: "Uploaded",
    error: "Failed",
  };

  const scrollToCapture = () => {
    if (typeof document === "undefined") return;
    const node = document.getElementById("work-order-photo-capture");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCaptionSubmit = captionForm.handleSubmit(
    safeSubmit(async (values) => {
      if (!captionDialog) return;
      const normalized = values.caption.trim();
      const payload = normalized.length ? normalized : null;
      const current = media.find((item) => item.id === captionDialog.id);
      const currentCaption = current?.caption ?? null;

      if ((currentCaption ?? null) === payload) {
        setCaptionDialog(null);
        return;
      }

      setIsSavingCaption(true);
      try {
        await onUpdateCaption({ id: captionDialog.id, caption: payload });
        setCaptionDialog(null);
      } finally {
        setIsSavingCaption(false);
      }
    }, {
      onError: (error) => {
        setIsSavingCaption(false);
        const friendly = mapErrorToFriendlyMessage(error, "saving the caption");
        captionForm.setError("caption", { type: "manual", message: friendly.description });
      },
    }),
  );

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
              {activeUploads.length > 0 && (
                <div
                  className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4"
                  role="region"
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Uploads in progress</p>
                    <Badge variant="secondary">{activeUploads.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {activeUploads.map((item) => {
                      const meta = item.meta?.category ?? "issue";
                      const descriptor = categoryLabels[meta];
                      return (
                        <Card key={item.id} className="border-dashed border-muted-foreground/30 bg-background/80">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{item.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {descriptor.label} • {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : "Preparing"}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  item.status === "error"
                                    ? "destructive"
                                    : item.status === "success"
                                      ? "default"
                                      : "outline"
                                }
                              >
                                {uploadStatusLabel[item.status]}
                              </Badge>
                            </div>
                            <Progress value={item.progress} aria-label={`${item.fileName} upload progress`} />
                            {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                              {item.status === "error" ? (
                                <>
                                  <Button
                                    size="xs"
                                    variant="secondary"
                                    onClick={() => onRetryUpload?.(item.id)}
                                  >
                                    <RotateCcw className="mr-1 h-3 w-3" /> Retry
                                  </Button>
                                  <Button size="xs" variant="ghost" onClick={() => onDismissUpload?.(item.id)}>
                                    <X className="mr-1 h-3 w-3" /> Dismiss
                                  </Button>
                                </>
                              ) : (
                                <Button size="xs" variant="ghost" onClick={() => onCancelUpload?.(item.id)}>
                                  <X className="mr-1 h-3 w-3" /> Cancel
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {isLoading && <CardSkeleton rows={3} />}

              {!isLoading && !filtered.length && (
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-12 text-center">
                  <img src={timelineEmpty} alt="" aria-hidden="true" className="h-32 w-auto" />
                  <div className="space-y-2 text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">No photos in this view yet</p>
                    <p className="text-xs max-w-md">
                      Snap a photo from the technician app or upload from the desktop workflow to capture progress, approvals, and issues.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={scrollToCapture}>
                    <Camera className="mr-2 h-4 w-4" /> Capture photo
                  </Button>
                </div>
              )}

              {!isLoading && filtered.length > 0 && (
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPendingDelete(item)}
                            disabled={isDeletingMedia && pendingDelete?.id === item.id}
                          >
                            {isDeletingMedia && pendingDelete?.id === item.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              )}
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
          <Form {...captionForm}>
            <form onSubmit={handleCaptionSubmit} className="space-y-4">
              <FormField
                control={captionForm.control}
                name="caption"
                render={({ field }) => {
                  const length = field.value?.length ?? 0;
                  return (
                    <FormItem>
                      <FormLabel>Caption</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          disabled={isSavingCaption || captionForm.formState.isSubmitting}
                          placeholder="Describe what changed in this photo"
                        />
                      </FormControl>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <FormMessage />
                        <span>{length}/140</span>
                      </div>
                    </FormItem>
                  );
                }}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCaptionDialog(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingCaption || captionForm.formState.isSubmitting}
                >
                  {isSavingCaption ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title="Delete this photo?"
        description="This permanently removes the media file and its annotations from the work order."
        confirmText="Delete"
        variant="destructive"
        preferenceKey="work-order-media.delete"
        loading={isDeletingMedia}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setIsDeletingMedia(true);
          try {
            await onDelete(pendingDelete);
          } finally {
            setIsDeletingMedia(false);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
};
