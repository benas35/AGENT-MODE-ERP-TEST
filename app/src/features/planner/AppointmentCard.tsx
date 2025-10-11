import type { KeyboardEvent, PointerEvent } from "react";
import type {
  DraggableProvidedDraggableProps,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { ResizeHandle } from "./ResizeHandle";
import type { PlannerStatus } from "./types";
import { ORG_TIMEZONE } from "./types";

const statusStyles: Record<PlannerStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-900 border border-amber-200",
  waiting_parts: "bg-red-100 text-red-900 border border-red-200",
  completed: "bg-emerald-100 text-emerald-900 border border-emerald-200",
};

const formatStatus = (status: PlannerStatus) =>
  status
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

interface AppointmentCardProps {
  appointment: {
    id: string;
    title: string;
    status: PlannerStatus;
    customerName: string | null;
    vehicleLabel: string | null;
    notes: string | null;
    startsAt: string;
    endsAt: string;
  };
  top: number;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeStart: (
    direction: "start" | "end"
  ) => (event: PointerEvent<HTMLDivElement>) => void;
  onOpen?: () => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  draggableProps: DraggableProvidedDraggableProps;
  innerRef: (element: HTMLElement | null) => void;
}

export const AppointmentCard = ({
  appointment,
  top,
  height,
  isDragging,
  isResizing,
  onPointerDown,
  onResizeStart,
  onOpen,
  dragHandleProps,
  draggableProps,
  innerRef,
}: AppointmentCardProps) => {
  const timeRange = `${formatInTimeZone(appointment.startsAt, ORG_TIMEZONE, "HH:mm")} – ${formatInTimeZone(
    appointment.endsAt,
    ORG_TIMEZONE,
    "HH:mm"
  )}`;
  const details = [appointment.customerName, appointment.vehicleLabel]
    .filter(Boolean)
    .join(" • ");

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    }
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      style={{
        ...draggableProps.style,
        position: "absolute",
        top,
        left: "0.75rem",
        right: "0.75rem",
        height,
      }}
      className={cn(
        "group select-none rounded-lg border border-border bg-card text-sm shadow-sm outline-none transition-shadow",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isDragging ? "ring-2 ring-primary shadow-lg" : "",
        isResizing ? "border-dashed" : ""
      )}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      aria-label={`${appointment.title} ${timeRange}`}
      data-appointment-card="true"
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
      onKeyDown={handleKeyDown}
    >
      <ResizeHandle direction="start" onPointerDown={onResizeStart("start")} />
      <div
        {...(dragHandleProps ?? {})}
        className="flex cursor-grab items-start justify-between gap-2 rounded-t-lg px-3 py-2 active:cursor-grabbing"
      >
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium leading-tight">{appointment.title}</p>
          <p className="text-xs text-muted-foreground">{timeRange}</p>
          {details ? (
            <p className="truncate text-xs text-muted-foreground">{details}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            statusStyles[appointment.status]
          )}
        >
          {formatStatus(appointment.status)}
        </span>
      </div>
      {appointment.notes ? (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          <p className="line-clamp-2 leading-snug">{appointment.notes}</p>
        </div>
      ) : null}
      <ResizeHandle direction="end" onPointerDown={onResizeStart("end")} />
    </div>
  );
};
