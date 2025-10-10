import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { VehicleMediaItem, useVehicleMedia } from "@/hooks/useVehicleMedia";
import { cn } from "@/lib/utils";
import { Camera, GripVertical, MoreHorizontal, Star } from "lucide-react";

interface VehicleMediaGalleryProps {
  vehicleId: string;
  className?: string;
}

const kindLabels: Record<string, string> = {
  hero: "Hero",
  front: "Front",
  rear: "Rear",
  interior: "Interior",
  damage: "Damage",
};

export const VehicleMediaGallery: React.FC<VehicleMediaGalleryProps> = ({ vehicleId, className }) => {
  const {
    media,
    isLoading,
    reorderMedia,
    setHero,
    deleteMedia,
    updateCaption,
    isReordering,
    isDeleting,
    isSettingHero,
    isUpdatingCaption,
  } = useVehicleMedia(vehicleId);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<VehicleMediaItem | null>(null);

  useEffect(() => {
    setCaptionDrafts(
      media.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.caption ?? "";
        return acc;
      }, {}),
    );
  }, [media]);

  const heroItem = useMemo(() => media.find((item) => item.kind === "hero"), [media]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(media);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    await reorderMedia(reordered);
  };

  const handleCaptionBlur = async (item: VehicleMediaItem) => {
    const draft = captionDrafts[item.id];
    if (draft === item.caption) return;
    await updateCaption({ id: item.id, caption: draft });
  };

  const galleryContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!media.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
          <Camera className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-base font-medium text-foreground">No vehicle media yet</p>
            <p className="text-sm text-muted-foreground">
              Upload inspection photos to highlight vehicle condition, customer approvals, and damage documentation.
            </p>
          </div>
        </div>
      );
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="vehicle-media" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {media.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border border-muted-foreground/20 bg-background shadow-sm transition",
                        snapshot.isDragging && "ring-2 ring-primary/50",
                      )}
                    >
                      <div className="absolute left-3 top-3 z-20 flex items-center gap-1 text-xs font-medium text-white">
                        <span className="rounded-full bg-black/70 px-2 py-1">
                          {kindLabels[item.kind] ?? item.kind}
                        </span>
                        {item.kind === "hero" && (
                          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-1">
                            <Star className="h-3 w-3" />
                            Hero
                          </span>
                        )}
                      </div>
                      <AspectRatio ratio={16 / 10}>
                        <img
                          src={item.url}
                          alt={item.caption ?? `Vehicle photo ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          className="absolute inset-0 flex items-start justify-between bg-gradient-to-b from-black/40 via-transparent to-black/40 p-3 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <span
                            {...draggableProvided.dragHandleProps}
                            className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white"
                          >
                            <GripVertical className="h-3 w-3" />
                            Drag to reorder
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="secondary" className="h-9 w-9 bg-black/60 text-white hover:bg-black/80">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                disabled={item.kind === "hero" || isSettingHero}
                                onClick={() => setHero(item)}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                Set as hero image
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPendingDelete(item)} disabled={isDeleting}>
                                Remove photo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </button>
                      </AspectRatio>
                      <div className="space-y-3 border-t border-muted-foreground/10 bg-background/90 p-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Uploaded {new Date(item.created_at).toLocaleDateString()}</span>
                          {heroItem && heroItem.id === item.id && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Current hero
                            </Badge>
                          )}
                        </div>
                        <label className="space-y-2 text-sm">
                          <span className="text-xs font-medium text-muted-foreground">Caption</span>
                          <textarea
                            value={captionDrafts[item.id] ?? ""}
                            onChange={(event) =>
                              setCaptionDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                            }
                            onBlur={() => handleCaptionBlur(item)}
                            rows={2}
                            className="w-full resize-none rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Add customer-facing notes"
                            disabled={isUpdatingCaption}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  };

  return (
    <Card className={cn("bg-background/80 backdrop-blur", className)}>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-primary" />
          Vehicle media
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Drag to reorder • Set hero image • Captions sync to customer portal</span>
          {isReordering && <span className="animate-pulse text-primary">Saving order…</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[520px] pr-2">
          {galleryContent()}
        </ScrollArea>
      </CardContent>
      <ConfirmationDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove photo?"
        description="This will permanently delete the photo from secure storage."
        confirmText="Delete photo"
        variant="destructive"
        loading={isDeleting}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteMedia(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </Card>
  );
};
