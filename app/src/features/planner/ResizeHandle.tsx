import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  direction: "start" | "end";
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}

export const ResizeHandle = ({ direction, onPointerDown }: ResizeHandleProps) => (
  <div
    role="separator"
    aria-orientation="horizontal"
    aria-label={direction === "start" ? "Extend appointment earlier" : "Extend appointment later"}
    tabIndex={-1}
    className={cn(
      "absolute left-3 right-3 h-3 cursor-ns-resize rounded-full bg-muted",
      direction === "start" ? "top-1" : "bottom-1",
      "opacity-100 md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
    )}
    onPointerDown={onPointerDown}
  />
);
