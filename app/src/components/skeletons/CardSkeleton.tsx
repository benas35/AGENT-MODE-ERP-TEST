import { HTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
}

export function CardSkeleton({ rows = 3, className, ...rest }: CardSkeletonProps) {
  const safeRows = Math.max(1, rows);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("space-y-4", className)}
      {...rest}
    >
      {Array.from({ length: safeRows }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="overflow-hidden rounded-xl border border-muted-foreground/20 bg-background/60 shadow-sm"
        >
          <Skeleton className="h-32 w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
