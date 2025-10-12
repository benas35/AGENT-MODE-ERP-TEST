import type { KeyboardEvent, PointerEvent } from "react";
import type {
  DraggableProvidedDraggableProps,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ResizeHandle } from "./ResizeHandle";
import type { PlannerStatus } from "./types";
import { PLANNER_STATUS_LABELS, PLANNER_STATUSES } from "./types";
import { formatInOrgTimezone } from "@/lib/timezone";

const cardStyles: Record<PlannerStatus, string> = {
  scheduled: "border-border bg-card",
  in_progress: "border-amber-300/80 bg-amber-50",
  waiting_parts: "border-red-300/80 bg-red-50",
  completed: "border-emerald-300 bg-emerald-50",
};

const statusChipStyles: Record<PlannerStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-900 border border-amber-300",
  waiting_parts: "bg-red-100 text-red-900 border border-red-300",
  completed: "bg-emerald-100 text-emerald-900 border border-emerald-300",
};

const quickActionTargets: { status: PlannerStatus; label: string }[] = [
  { status: "in_progress", label: "Start" },
  { status: "waiting_parts", label: "Waiting Parts" },
  { status: "completed", label: "Complete" },
];

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
  onStatusChange: (status: PlannerStatus) => void | Promise<void>;
  disableStatusActions?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  draggableProps: DraggableProvidedDraggableProps;
  innerRef: (element: HTMLElement | null) => void;
  hasConflict?: boolean;
  conflictMessage?: string;
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
  onStatusChange,
  disableStatusActions = false,
  dragHandleProps,
  draggableProps,
  innerRef,
  hasConflict = false,
  conflictMessage,
}: AppointmentCardProps) => {
  const timeRange = `${formatInOrgTimezone(appointment.startsAt, "HH:mm")} – ${formatInOrgTimezone(
    appointment.endsAt,
    "HH:mm"
  )}`;
  const details = [appointment.customerName, appointment.vehicleLabel]
    .filter(Boolean)
    .join(" • ");
  const isCompleted = appointment.status === "completed";

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <ContextMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
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
                  "group relative select-none rounded-lg border text-sm shadow-sm outline-none transition-shadow transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  cardStyles[appointment.status],
                  isDragging ? "ring-2 ring-primary shadow-lg" : "",
                  isResizing ? "border-dashed" : "",
                  hasConflict ? "border-destructive/70 ring-2 ring-destructive/50" : ""
                )}
                onPointerDown={onPointerDown}
                role="button"
                tabIndex={0}
                aria-label={`${appointment.title} ${timeRange}`}
                aria-invalid={hasConflict || undefined}
                aria-describedby={hasConflict ? `${appointment.id}-conflict` : undefined}
                data-appointment-card="true"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen?.();
                }}
                onKeyDown={handleKeyDown}
              >
                {hasConflict ? (
                  <>
                    <span id={`${appointment.id}-conflict`} className="sr-only">
                      {conflictMessage ?? "Conflicts with another appointment"}
                    </span>
                    <span
                      className="pointer-events-none absolute inset-0 rounded-lg bg-destructive/10"
                      aria-hidden
                    />
                  </>
                ) : null}
                <ResizeHandle direction="start" onPointerDown={onResizeStart("start")} />
                <div
                  {...(dragHandleProps ?? {})}
                  aria-label={`${appointment.title} drag handle`}
                  className="flex cursor-grab items-start justify-between gap-2 rounded-t-lg px-3 py-2 active:cursor-grabbing"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-1 truncate font-medium leading-tight">
                      {isCompleted ? <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-600" /> : null}
                      <span className="truncate">{appointment.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{timeRange}</p>
                    {details ? (
                      <p className="truncate text-xs text-muted-foreground">{details}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      statusChipStyles[appointment.status]
                    )}
                  >
                    {PLANNER_STATUS_LABELS[appointment.status]}
                  </span>
                </div>
                {appointment.notes ? (
                  <div className="px-3 pb-2 text-xs text-muted-foreground">
                    <p className="line-clamp-2 leading-snug">{appointment.notes}</p>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "absolute bottom-3 right-3 flex flex-wrap justify-end gap-1",
                    "pointer-events-none opacity-0 transition-opacity duration-150",
                    "group-hover:pointer-events-auto group-hover:opacity-100",
                    "group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                  )}
                >
                  {quickActionTargets.map((action) => (
                    <Button
                      key={action.status}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="pointer-events-auto h-7 px-2 text-xs shadow-sm backdrop-blur bg-background/80"
                      disabled={disableStatusActions || appointment.status === action.status}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onStatusChange(action.status);
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <ResizeHandle direction="end" onPointerDown={onResizeStart("end")} />
              </div>
            </ContextMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-xs space-y-1 text-sm">
            <p className="font-semibold leading-snug">{appointment.title}</p>
            <p className="text-xs text-muted-foreground">{timeRange}</p>
            {details ? <p className="text-xs text-muted-foreground">{details}</p> : null}
            {appointment.notes ? (
              <p className="text-xs text-muted-foreground">{appointment.notes}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Change status</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={appointment.status}
            onValueChange={(value) => {
              const next = value as PlannerStatus;
              if (next === appointment.status || disableStatusActions) {
                return;
              }
              void onStatusChange(next);
            }}
          >
            {PLANNER_STATUSES.map((status) => (
              <ContextMenuRadioItem key={status} value={status}>
                {PLANNER_STATUS_LABELS[status]}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  );
};
