import { HTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({
  rows = 6,
  cols = 4,
  className,
  ...rest
}: TableSkeletonProps) {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "w-full overflow-hidden rounded-lg border border-muted-foreground/20 bg-background/60 p-4 shadow-sm",
        className,
      )}
      {...rest}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}>
          {Array.from({ length: safeCols }).map((_, index) => (
            <Skeleton key={`header-${index}`} className="h-3 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: safeRows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid items-center gap-3 rounded-md border border-muted-foreground/10 bg-muted/30 px-3 py-2"
              style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: safeCols }).map((_, colIndex) => (
                <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-3 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
