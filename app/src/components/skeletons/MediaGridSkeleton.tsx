import { HTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MediaGridSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  cols?: number;
}

export function MediaGridSkeleton({
  rows = 2,
  cols = 3,
  className,
  ...rest
}: MediaGridSkeletonProps) {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const total = safeRows * safeCols;
  const minWidth = Math.max(180, Math.floor(960 / safeCols));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
      {...rest}
    >
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={`media-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-muted-foreground/20 bg-background/50 shadow-sm"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
