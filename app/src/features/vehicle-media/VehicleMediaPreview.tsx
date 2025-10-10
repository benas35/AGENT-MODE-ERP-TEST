import { useVehicleMedia } from "@/hooks/useVehicleMedia";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface VehicleMediaPreviewProps {
  vehicleId: string;
  className?: string;
  limit?: number;
}

export const VehicleMediaPreview: React.FC<VehicleMediaPreviewProps> = ({
  vehicleId,
  className,
  limit = 3,
}) => {
  const { media, isLoading } = useVehicleMedia(vehicleId);
  const previewItems = media.slice(0, limit);

  if (isLoading) {
    return (
      <div className={cn("flex gap-2", className)}>
        {Array.from({ length: limit }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!previewItems.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-xs text-muted-foreground",
          className,
        )}
      >
        No vehicle photos yet.
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {previewItems.map((item) => (
        <AspectRatio key={item.id} ratio={4 / 3}>
          <img
            src={item.url}
            alt={item.caption ?? "Vehicle photo"}
            className="h-full w-full rounded-md object-cover"
            loading="lazy"
          />
        </AspectRatio>
      ))}
    </div>
  );
};
