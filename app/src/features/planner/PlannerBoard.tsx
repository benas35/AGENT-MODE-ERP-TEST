import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DragStart,
  type DragUpdate,
  type DropResult,
} from "@hello-pangea/dnd";
import { addMinutes, differenceInMinutes, format, isSameDay } from "date-fns";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { mapErrorToFriendlyMessage, type FriendlyErrorMessage } from "@/lib/errorHandling";
import { formatInOrgTimezone } from "@/lib/timezone";
import {
  type CanScheduleInput,
  type PlannerAppointment,
  type PlannerMovePayload,
  type PlannerResizePayload,
  type PlannerStatus,
  type PlannerTechnician,
  DEFAULT_APPOINTMENT_MINUTES,
  MIN_SLOT_MINUTES,
} from "./types";
import { AppointmentCard } from "./AppointmentCard";
import { getBoardWindow, minuteHeight, pixelsToTime, timeToPixels, toUtcIso, toZoned } from "./utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PlannerBoardProps {
  date: Date;
  technicians: PlannerTechnician[];
  appointments: PlannerAppointment[];
  isLoading?: boolean;
  activeBayId?: string | null;
  onAppointmentMove: (payload: PlannerMovePayload) => Promise<void>;
  onAppointmentResize: (payload: PlannerResizePayload) => Promise<void>;
  onAppointmentClick?: (id: string) => void;
  onSlotCreate?: (payload: {
    technicianId: string | null;
    bayId: string | null;
    startsAt: string;
    endsAt: string;
  }) => void;
  onStatusChange: (payload: { id: string; status: PlannerStatus }) => Promise<void>;
  disableStatusActions?: boolean;
  canSchedule: (input: CanScheduleInput) => Promise<boolean>;
}

interface DerivedAppointment extends PlannerAppointment {
  startZoned: Date;
  endZoned: Date;
}

const technicianPalette = [
  "#0f172a",
  "#047857",
  "#7c3aed",
  "#b45309",
  "#1d4ed8",
  "#be123c",
];

const clampDate = (value: Date, min: Date, max: Date) =>
  new Date(Math.min(Math.max(value.getTime(), min.getTime()), max.getTime()));

const isFriendlyErrorMessage = (value: unknown): value is FriendlyErrorMessage => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "title" in value &&
      typeof (value as { title?: unknown }).title === "string" &&
      "description" in value &&
      typeof (value as { description?: unknown }).description === "string"
  );
};

const resolveFriendlyError = (error: unknown, context: string): FriendlyErrorMessage => {
  if (isFriendlyErrorMessage(error)) {
    return error;
  }
  return mapErrorToFriendlyMessage(error, context);
};

export const PlannerBoard = ({
  date,
  technicians,
  appointments,
  isLoading = false,
  activeBayId = null,
  onAppointmentMove,
  onAppointmentResize,
  onAppointmentClick,
  onSlotCreate,
  onStatusChange,
  disableStatusActions = false,
  canSchedule,
}: PlannerBoardProps) => {
  const filteredAppointments = useMemo(
    () =>
      (activeBayId ? appointments.filter((item) => item.bayId === activeBayId) : appointments).sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [appointments, activeBayId]
  );

  const derivedAppointments = useMemo<DerivedAppointment[]>(
    () =>
      filteredAppointments.map((appointment) => ({
        ...appointment,
        startZoned: toZoned(appointment.startsAt),
        endZoned: toZoned(appointment.endsAt),
      })),
    [filteredAppointments]
  );

  const derivedMap = useMemo(() => {
    const map = new Map<string, DerivedAppointment>();
    for (const appointment of derivedAppointments) {
      map.set(appointment.id, appointment);
    }
    return map;
  }, [derivedAppointments]);

  const boardWindow = useMemo(
    () => getBoardWindow(date, filteredAppointments),
    [date, filteredAppointments]
  );

  const totalMinutes = differenceInMinutes(boardWindow.end, boardWindow.start);
  const totalPixels = totalMinutes * minuteHeight;
  const totalSlots = Math.ceil(totalMinutes / MIN_SLOT_MINUTES);

  const nowOffset = useMemo(() => {
    const zonedToday = toZoned(date);
    const zonedNow = toZoned(new Date());
    if (!isSameDay(zonedToday, zonedNow)) {
      return null;
    }
    const offset = timeToPixels(zonedNow, boardWindow.start);
    if (offset < 0 || offset > totalPixels) {
      return null;
    }
    return offset;
  }, [boardWindow.start, date, totalPixels]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<
    Record<string, { start: Date; end: Date; technicianId: string | null }>
  >({});

  const laneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pointerOffsets = useRef<Record<string, number>>({});
  const pointerPosition = useRef<number | null>(null);
  const destinationLane = useRef<string | null>(null);

  const registerLaneRef = useCallback((laneId: string, node: HTMLDivElement | null) => {
    laneRefs.current[laneId] = node;
  }, []);

  const updateOptimisticPosition = useCallback(
    (laneId?: string) => {
      if (!draggingId) return;
      const derived = derivedMap.get(draggingId);
      if (!derived) return;

      const targetLane = laneId ?? destinationLane.current ?? derived.technicianId ?? null;
      const laneKey = targetLane ?? "unassigned";
      const laneElement = laneRefs.current[laneKey];
      const offset = pointerOffsets.current[draggingId] ?? 0;
      const pointerY = pointerPosition.current;
      const duration = Math.max(
        MIN_SLOT_MINUTES,
        differenceInMinutes(derived.endZoned, derived.startZoned)
      );

      if (!laneElement || pointerY == null) {
        setOptimistic((prev) => ({
          ...prev,
          [draggingId]: {
            start: prev[draggingId]?.start ?? derived.startZoned,
            end: prev[draggingId]?.end ?? derived.endZoned,
            technicianId: targetLane,
          },
        }));
        return;
      }

      const rect = laneElement.getBoundingClientRect();
      const rawMinutes = (pointerY - rect.top - offset) / minuteHeight;
      const snapped = Math.round(rawMinutes / MIN_SLOT_MINUTES) * MIN_SLOT_MINUTES;
      const limited = Math.min(
        Math.max(0, snapped),
        Math.max(0, totalMinutes - duration)
      );
      const start = addMinutes(boardWindow.start, limited);
      const end = addMinutes(start, duration);

      setOptimistic((prev) => ({
        ...prev,
        [draggingId]: {
          start,
          end,
          technicianId: targetLane,
        },
      }));
    },
    [boardWindow.start, derivedMap, draggingId, totalMinutes]
  );

  useEffect(() => {
    if (!draggingId) return;
    const handlePointerMove = (event: PointerEvent) => {
      pointerPosition.current = event.clientY;
      updateOptimisticPosition();
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [draggingId, updateOptimisticPosition]);

  const handlePointerDown = useCallback((id: string, event: React.PointerEvent<HTMLDivElement>) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pointerOffsets.current[id] = event.clientY - rect.top;
    pointerPosition.current = event.clientY;
  }, []);

  const handleLaneClick = useCallback(
    (laneId: string | null) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onSlotCreate) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-appointment-card="true"]')) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const normalized = Math.max(0, Math.min(event.clientY - rect.top, totalPixels));
      const rawStart = pixelsToTime(normalized, boardWindow.start);
      const maxStartCandidate = addMinutes(boardWindow.end, -DEFAULT_APPOINTMENT_MINUTES);
      const maxStart =
        maxStartCandidate.getTime() < boardWindow.start.getTime()
          ? boardWindow.start
          : maxStartCandidate;
      const start = clampDate(rawStart, boardWindow.start, maxStart);
      const end = addMinutes(start, DEFAULT_APPOINTMENT_MINUTES);

      onSlotCreate({
        technicianId: laneId,
        bayId: activeBayId ?? null,
        startsAt: toUtcIso(start),
        endsAt: toUtcIso(end),
      });
    },
    [activeBayId, boardWindow.end, boardWindow.start, onSlotCreate, totalPixels]
  );

  const handleDragStart = useCallback(
    (start: DragStart) => {
      setDraggingId(start.draggableId);
      destinationLane.current = start.source.droppableId;
      const derived = derivedMap.get(start.draggableId);
      if (derived) {
        setOptimistic((prev) => ({
          ...prev,
          [start.draggableId]: {
            start: derived.startZoned,
            end: derived.endZoned,
            technicianId: derived.technicianId,
          },
        }));
      }
    },
    [derivedMap]
  );

  const handleDragUpdate = useCallback(
    (update: DragUpdate) => {
      if (!draggingId) return;
      if (update.destination?.droppableId) {
        destinationLane.current = update.destination.droppableId;
      }
      updateOptimisticPosition(update.destination?.droppableId);
    },
    [draggingId, updateOptimisticPosition]
  );

  const clearOptimistic = useCallback((id: string) => {
    setOptimistic((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDraggingId(null);
      clearOptimistic(draggingId);
      destinationLane.current = null;
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearOptimistic, draggingId]);

  const checkConflict = useCallback(
    (
      id: string,
      start: Date,
      end: Date,
      technicianId: string | null,
      bayId: string | null
    ) =>
      derivedAppointments.some((other) => {
        if (other.id === id) return false;
        const override = optimistic[other.id];
        const otherStart = override?.start ?? other.startZoned;
        const otherEnd = override?.end ?? other.endZoned;
        const otherTechnician = override?.technicianId ?? other.technicianId ?? null;
        const sameTechnician = otherTechnician === technicianId;
        const sameBay = bayId != null && other.bayId != null && other.bayId === bayId;
        if (!sameTechnician && !sameBay) return false;
        return start < otherEnd && end > otherStart;
      }),
    [derivedAppointments, optimistic]
  );

  const findNearestAvailableSlot = useCallback(
    (
      id: string,
      technicianId: string | null,
      bayId: string | null,
      start: Date,
      end: Date
    ) => {
      const durationMinutes = Math.max(
        MIN_SLOT_MINUTES,
        differenceInMinutes(end, start)
      );
      const latestStart = addMinutes(boardWindow.end, -durationMinutes);
      let candidate = start;
      while (candidate.getTime() <= latestStart.getTime()) {
        const candidateEnd = addMinutes(candidate, durationMinutes);
        if (!checkConflict(id, candidate, candidateEnd, technicianId, bayId)) {
          return candidate;
        }
        candidate = addMinutes(candidate, MIN_SLOT_MINUTES);
      }
      return null;
    },
    [boardWindow.end, checkConflict]
  );

  const handleStatusChange = useCallback(
    async (id: string, status: PlannerStatus) => {
      const current = derivedMap.get(id);
      if (!current || current.status === status) {
        return;
      }

      try {
        await onStatusChange({ id, status });
      } catch (error) {
        const friendly = resolveFriendlyError(error, "updating the status");
        toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
      }
    },
    [derivedMap, onStatusChange]
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, draggableId } = result;
      setDraggingId(null);

      const derived = derivedMap.get(draggableId);
      if (!destination || !derived) {
        clearOptimistic(draggableId);
        destinationLane.current = null;
        return;
      }

      const laneId = destination.droppableId;
      const laneElement = laneRefs.current[laneId] ?? laneRefs.current["unassigned"];
      const offset = pointerOffsets.current[draggableId] ?? 0;
      const pointerY = pointerPosition.current;
      const duration = Math.max(
        MIN_SLOT_MINUTES,
        differenceInMinutes(derived.endZoned, derived.startZoned)
      );

      let start = optimistic[draggableId]?.start ?? derived.startZoned;

      if (laneElement && pointerY != null) {
        const rect = laneElement.getBoundingClientRect();
        const rawMinutes = (pointerY - rect.top - offset) / minuteHeight;
        const snapped = Math.round(rawMinutes / MIN_SLOT_MINUTES) * MIN_SLOT_MINUTES;
        const limited = Math.min(
          Math.max(0, snapped),
          Math.max(0, totalMinutes - duration)
        );
        start = addMinutes(boardWindow.start, limited);
      }

      const end = addMinutes(start, duration);
      const technicianId = laneId === "unassigned" ? null : laneId;

      try {
        const payload = {
          id: draggableId,
          technicianId,
          bayId: derived.bayId,
          startsAt: toUtcIso(start),
          endsAt: toUtcIso(end),
        } satisfies PlannerMovePayload;

        const allowed = await canSchedule({
          technicianId,
          bayId: derived.bayId,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          appointmentId: draggableId,
        });

        if (!allowed) {
          const suggestionStart = findNearestAvailableSlot(
            draggableId,
            technicianId,
            derived.bayId,
            start,
            end
          );
          const durationMinutes = Math.max(
            MIN_SLOT_MINUTES,
            differenceInMinutes(end, start)
          );
          const suggestionText = suggestionStart
            ? `Next open window: ${formatInOrgTimezone(
                suggestionStart,
                "HH:mm"
              )} – ${formatInOrgTimezone(
                addMinutes(suggestionStart, durationMinutes),
                "HH:mm"
              )}`
            : null;
          toast({
            title: "Cannot move appointment",
            description:
              "This slot conflicts with another appointment." +
              (suggestionText ? ` ${suggestionText}.` : ""),
            variant: "destructive",
          });
          return;
        }

        await onAppointmentMove(payload);
      } catch (error) {
        const friendly = resolveFriendlyError(error, "moving the appointment");
        toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
      } finally {
        clearOptimistic(draggableId);
        destinationLane.current = null;
      }
    },
    [
      boardWindow.start,
      canSchedule,
      clearOptimistic,
      derivedMap,
      onAppointmentMove,
      optimistic,
      totalMinutes,
    ]
  );

  const handleResizeStart = useCallback(
    (id: string, laneId: string, direction: "start" | "end") =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const derived = derivedMap.get(id);
        if (!derived) return;
        const laneElement = laneRefs.current[laneId];
        if (!laneElement) return;

        setResizingId(id);
        setOptimistic((prev) => ({
          ...prev,
          [id]: prev[id] ?? {
            start: derived.startZoned,
            end: derived.endZoned,
            technicianId: derived.technicianId,
          },
        }));

        const handleMove = (moveEvent: PointerEvent) => {
          setOptimistic((prev) => {
            const current = prev[id] ?? {
              start: derived.startZoned,
              end: derived.endZoned,
              technicianId: derived.technicianId,
            };
            const rect = laneElement.getBoundingClientRect();
            const normalized = Math.max(0, Math.min(moveEvent.clientY - rect.top, totalPixels));
            if (direction === "start") {
              const candidate = pixelsToTime(normalized, boardWindow.start);
              const maxStart = addMinutes(current.end, -MIN_SLOT_MINUTES);
              const clamped = clampDate(candidate, boardWindow.start, maxStart);
              return { ...prev, [id]: { ...current, start: clamped } };
            }
            const candidate = pixelsToTime(normalized, boardWindow.start);
            const minEnd = addMinutes(current.start, MIN_SLOT_MINUTES);
            const clamped = clampDate(candidate, minEnd, boardWindow.end);
            return { ...prev, [id]: { ...current, end: clamped } };
          });
        };

        const handleKeyDown = (keyEvent: KeyboardEvent) => {
          if (keyEvent.key !== "Escape") return;
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("keydown", handleKeyDown);
          setResizingId(null);
          clearOptimistic(id);
        };

        const handleUp = async () => {
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("keydown", handleKeyDown);

          let finalStart = derived.startZoned;
          let finalEnd = derived.endZoned;

          setOptimistic((prev) => {
            const current = prev[id] ?? {
              start: derived.startZoned,
              end: derived.endZoned,
              technicianId: derived.technicianId,
            };
            finalStart = current.start;
            finalEnd = current.end;
            return prev;
          });

          setResizingId(null);

          try {
            const payload = {
              id,
              startsAt: toUtcIso(finalStart),
              endsAt: toUtcIso(finalEnd),
            } satisfies PlannerResizePayload;

            const allowed = await canSchedule({
              technicianId: derived.technicianId,
              bayId: derived.bayId,
              startsAt: payload.startsAt,
              endsAt: payload.endsAt,
              appointmentId: id,
            });

            if (!allowed) {
              const suggestionStart = findNearestAvailableSlot(
                id,
                derived.technicianId ?? null,
                derived.bayId,
                finalStart,
                finalEnd
              );
              const durationMinutes = Math.max(
                MIN_SLOT_MINUTES,
                differenceInMinutes(finalEnd, finalStart)
              );
              const suggestionText = suggestionStart
                ? `Next open window: ${formatInOrgTimezone(
                    suggestionStart,
                    "HH:mm"
                  )} – ${formatInOrgTimezone(
                    addMinutes(suggestionStart, durationMinutes),
                    "HH:mm"
                  )}`
                : null;
              toast({
                title: "Cannot resize appointment",
                description:
                  "This change conflicts with another appointment." +
                  (suggestionText ? ` ${suggestionText}.` : ""),
                variant: "destructive",
              });
              return;
            }

            await onAppointmentResize(payload);
          } catch (error) {
            const friendly = resolveFriendlyError(error, "resizing the appointment");
            toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
          } finally {
            clearOptimistic(id);
          }
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp, { once: true });
        window.addEventListener("keydown", handleKeyDown);
      },
    [
      boardWindow.end,
      boardWindow.start,
      canSchedule,
      clearOptimistic,
      derivedMap,
      findNearestAvailableSlot,
      onAppointmentResize,
      totalPixels,
    ]
  );

  const columns = useMemo(() => {
    const assignments = new Map<string, DerivedAppointment[]>();
    for (const technician of technicians) {
      assignments.set(technician.id, []);
    }
    assignments.set("unassigned", []);

    for (const appointment of derivedAppointments) {
      const override = optimistic[appointment.id]?.technicianId;
      const laneKey = override ?? appointment.technicianId ?? "unassigned";
      const bucket = assignments.get(laneKey) ?? assignments.get("unassigned");
      bucket?.push(appointment);
    }

    return [
      {
        laneId: "unassigned",
        technician: null,
        appointments: assignments.get("unassigned") ?? [],
      },
      ...technicians.map((technician, index) => ({
        laneId: technician.id,
        technician,
        color: technician.color || technicianPalette[index % technicianPalette.length],
        appointments: assignments.get(technician.id) ?? [],
      })),
    ];
  }, [derivedAppointments, optimistic, technicians]);

  const gridLines = useMemo(
    () =>
      Array.from({ length: totalSlots + 1 }, (_, index) => {
        const current = addMinutes(boardWindow.start, index * MIN_SLOT_MINUTES);
        const top = index * MIN_SLOT_MINUTES * minuteHeight;
        const isHour = current.getMinutes() === 0;
        return {
          key: index,
          top,
          label: isHour ? format(current, "HH:mm") : null,
          subtle: !isHour,
        };
      }),
    [boardWindow.start, totalSlots]
  );

  if (isLoading) {
    const skeletonColumns = Math.max(technicians.length || 0, 3);
    return (
      <div className="flex h-full flex-col gap-6 rounded-lg border border-dashed p-6" role="status" aria-live="polite">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden">
          {Array.from({ length: skeletonColumns }).map((_, index) => (
            <div key={index} className="flex w-full min-w-[240px] flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-full min-h-[200px] w-full" />
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Loading planner…</span>
      </div>
    );
  }

  if (technicians.length === 0 && columns[0]?.appointments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold">No technicians configured</p>
          <p className="text-sm text-muted-foreground">
            Add technicians to your organisation to start scheduling appointments.
          </p>
        </div>
      </div>
    );
  }

  const hasAppointments = columns.some((column) => column.appointments.length > 0);

  const handleCreateFromEmptyState = () => {
    if (!onSlotCreate) return;
    const startsAt = toUtcIso(boardWindow.start);
    const endsAt = toUtcIso(addMinutes(boardWindow.start, DEFAULT_APPOINTMENT_MINUTES));
    onSlotCreate({ technicianId: null, bayId: activeBayId ?? null, startsAt, endsAt });
  };

  if (!hasAppointments) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold">No appointments scheduled yet</p>
          <p className="text-sm text-muted-foreground">Create your first appointment to populate the planner.</p>
        </div>
        {onSlotCreate ? (
          <Button size="sm" onClick={handleCreateFromEmptyState}>
            Create appointment
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full overflow-hidden rounded-lg border">
        <div className="relative w-20 shrink-0 border-r bg-muted/40">
          {gridLines.map((line) => (
            <div key={line.key} className="absolute left-0 right-0" style={{ top: line.top }}>
              <div className="flex h-[2px] items-center">
                <div className="h-px w-full bg-border" />
              </div>
              {line.label ? (
                <span className="absolute left-2 top-0 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {line.label}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-max">
            {columns.map(({ laneId, technician, appointments: laneAppointments, color }, columnIndex) => (
              <div key={laneId} className="flex min-w-[280px] flex-col border-r last:border-r-0">
                <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-2 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color ?? technician?.color ?? technicianPalette[columnIndex % technicianPalette.length] }}
                    aria-hidden
                  />
                  {technician ? technician.name : "Unassigned"}
                </div>
                {technician?.skills?.length ? (
                  <span className="text-xs text-muted-foreground">{technician.skills.join(", ")}</span>
                ) : null}
              </div>
              <Droppable droppableId={technician ? technician.id : "unassigned"} type="appointment" ignoreContainerClipping>
                {(provided) => (
                  <div
                    ref={(node) => {
                      provided.innerRef(node);
                      registerLaneRef(technician ? technician.id : "unassigned", node);
                    }}
                    {...provided.droppableProps}
                    className="relative flex-1"
                    aria-label={technician ? `${technician.name} lane` : "Unassigned lane"}
                  >
                    <div className="absolute inset-0">
                      {gridLines.map((line) => (
                        <div
                          key={line.key}
                          className={cn(
                            "absolute left-0 right-0 border-t",
                            line.label ? "border-border" : "border-border/50"
                          )}
                          style={{ top: line.top }}
                          aria-hidden
                        />
                      ))}
                      {nowOffset != null ? (
                        <div
                          className="absolute left-0 right-0 h-[2px] bg-primary"
                          style={{ top: nowOffset }}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div
                      className="relative h-full"
                      style={{ height: totalPixels }}
                      onClick={handleLaneClick(technician ? technician.id : null)}
                    >
                      {laneAppointments.map((appointment, index) => {
                        const override = optimistic[appointment.id];
                        const start = override?.start ?? appointment.startZoned;
                        const end = override?.end ?? appointment.endZoned;
                        const candidateTechnician =
                          override?.technicianId ?? (technician ? technician.id : null);
                        const isActive = draggingId === appointment.id || resizingId === appointment.id;
                        const hasConflict =
                          isActive &&
                          checkConflict(
                            appointment.id,
                            start,
                            end,
                            candidateTechnician,
                            appointment.bayId
                          );
                        const top = timeToPixels(start, boardWindow.start);
                        const height = Math.max(
                          MIN_SLOT_MINUTES * minuteHeight,
                          timeToPixels(end, boardWindow.start) - top
                        );

                        return (
                          <Draggable key={appointment.id} draggableId={appointment.id} index={index}>
                            {(dragProvided, snapshot) => (
                              <AppointmentCard
                                appointment={appointment}
                                top={top}
                                height={height}
                                isDragging={snapshot.isDragging}
                                isResizing={resizingId === appointment.id}
                                onPointerDown={(event) => handlePointerDown(appointment.id, event)}
                                onResizeStart={(direction) =>
                                  handleResizeStart(
                                    appointment.id,
                                    technician ? technician.id : "unassigned",
                                    direction
                                  )
                                }
                                onOpen={onAppointmentClick ? () => onAppointmentClick(appointment.id) : undefined}
                                onStatusChange={(status) => handleStatusChange(appointment.id, status)}
                                disableStatusActions={disableStatusActions}
                                dragHandleProps={dragProvided.dragHandleProps}
                                draggableProps={dragProvided.draggableProps}
                                innerRef={dragProvided.innerRef}
                                hasConflict={hasConflict}
                                conflictMessage="Conflicts with another appointment in this lane or bay"
                              />
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
};
