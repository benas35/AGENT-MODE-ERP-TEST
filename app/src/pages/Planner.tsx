import { useEffect, useMemo, useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlannerBoard } from "@/features/planner/PlannerBoard";
import {
  usePlannerAppointments,
  usePlannerBays,
  usePlannerResourceAvailability,
  usePlannerTechnicians,
  type PlannerBay,
} from "@/features/planner/hooks";
import { EditAppointmentDrawer } from "@/features/planner/EditAppointmentDrawer";
import { AppointmentDialog } from "@/features/planner/AppointmentDialog";
import { ResourceManagementDrawer } from "@/features/planner/ResourceManagementDrawer";
import { ORG_TIMEZONE } from "@/features/planner/types";
import { formatInOrgTimezone, toOrgZonedTime } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";
import { mapErrorToFriendlyMessage, type FriendlyErrorMessage } from "@/lib/errorHandling";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlannerMobileTimeline } from "@/features/planner/PlannerMobileTimeline";

type DrawerState =
  | { mode: "closed" }
  | { mode: "create"; technicianId: string | null; bayId: string | null; startsAt: string; endsAt: string }
  | { mode: "edit"; appointmentId: string };

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

const Planner = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedBayId, setSelectedBayId] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: "closed" });
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board");
  const isMobile = useIsMobile();

  const techniciansQuery = usePlannerTechnicians();
  const baysQuery = usePlannerBays();
  const appointmentsQuery = usePlannerAppointments(selectedDate, { bayId: selectedBayId });
  const resourceAvailability = usePlannerResourceAvailability();

  const isLoading = techniciansQuery.isLoading || appointmentsQuery.isLoading;
  const isMutating = appointmentsQuery.isMutating;

  useEffect(() => {
    setViewMode((current) => {
      if (isMobile && current !== "timeline") return "timeline";
      if (!isMobile && current === "timeline") return "board";
      return current;
    });
  }, [isMobile]);

  const dateLabel = formatInOrgTimezone(selectedDate, "EEEE, MMM d");
  const bayOptions = useMemo(() => {
    const bays: PlannerBay[] = baysQuery.data ?? [];
    if (bays.length > 0) {
      return bays;
    }

    const fallback = new Map<string, string>();
    for (const appointment of appointmentsQuery.appointments) {
      if (appointment.bayId && !fallback.has(appointment.bayId)) {
        fallback.set(appointment.bayId, `Bay ${appointment.bayId.slice(0, 4).toUpperCase()}`);
      }
    }

    return Array.from(fallback.entries()).map(([id, name]) => ({ id, name }));
  }, [appointmentsQuery.appointments, baysQuery.data]);

  const handlePrevDay = () => setSelectedDate((prev) => addDays(prev, -1));
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const refreshAppointments = () => {
    void appointmentsQuery.refetch();
  };

  const bayValue = selectedBayId ?? "all";

  const laneOverlays = useMemo(() => {
    const overlays: Record<
      string,
      { availability: { start: Date; end: Date }[]; timeOff: { id: string; start: Date; end: Date; reason: string | null }[] }
    > = {};

    const zonedDay = toOrgZonedTime(selectedDate);
    if (Number.isNaN(zonedDay.getTime())) {
      return overlays;
    }
    const weekday = zonedDay.getUTCDay();
    const dayStart = startOfDay(zonedDay);
    const dayEnd = addDays(dayStart, 1);

    const ensureOverlay = (key: string) => {
      if (!overlays[key]) {
        overlays[key] = { availability: [], timeOff: [] };
      }
      return overlays[key];
    };

    const createZonedDate = (time: string) => {
      const [hour = "0", minute = "0"] = time.split(":");
      const date = new Date(dayStart);
      date.setUTCHours(Number(hour), Number(minute), 0, 0);
      return date;
    };

    for (const entry of resourceAvailability.availability) {
      if (entry.weekday !== weekday) continue;
      const overlay = ensureOverlay(entry.resourceId);
      overlay.availability = [
        ...overlay.availability,
        { start: createZonedDate(entry.startTime), end: createZonedDate(entry.endTime) },
      ];
    }

    for (const entry of resourceAvailability.timeOff) {
      const start = toOrgZonedTime(entry.startTime);
      const end = toOrgZonedTime(entry.endTime);
      if (!(start < dayEnd && end > dayStart)) {
        continue;
      }
      const overlay = ensureOverlay(entry.resourceId);
      overlay.timeOff = [
        ...overlay.timeOff,
        {
          id: entry.id,
          start: start < dayStart ? dayStart : start,
          end: end > dayEnd ? dayEnd : end,
          reason: entry.reason ?? null,
        },
      ];
    }

    for (const technician of techniciansQuery.data ?? []) {
      const sourceKey = technician.resourceId ?? technician.id;
      const source = overlays[sourceKey];
      if (!source) continue;
      const target = ensureOverlay(technician.id);
      target.availability = [...target.availability, ...source.availability];
      target.timeOff = [...target.timeOff, ...source.timeOff];
    }

    return overlays;
  }, [
    resourceAvailability.availability,
    resourceAvailability.timeOff,
    selectedDate,
    techniciansQuery.data,
  ]);

  const dialogAppointment = useMemo(
    () => appointmentsQuery.appointments.find((item) => item.id === activeAppointmentId) ?? null,
    [appointmentsQuery.appointments, activeAppointmentId]
  );

  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Drag appointments to adjust times, reassign technicians, or resize durations in fifteen-minute increments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAppointments}
            aria-label="Refresh appointments"
            disabled={appointmentsQuery.isFetching || isMutating}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                appointmentsQuery.isFetching || isMutating ? "animate-spin" : undefined
              )}
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResourceDrawerOpen(true)}
            disabled={resourceAvailability.isLoading}
          >
            Manage availability
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 text-sm font-medium">
          <CalendarIcon className="h-4 w-4" aria-hidden />
          {dateLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">Times shown in Europe/Vilnius</span>
        <Select
          value={bayValue}
          onValueChange={(value) => setSelectedBayId(value === "all" ? null : value)}
          disabled={baysQuery.isLoading && bayOptions.length === 0}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filter by bay">
            <SelectValue placeholder="All bays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bays</SelectItem>
            {bayOptions.map((bay) => (
              <SelectItem key={bay.id} value={bay.id}>
                {bay.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "board" | "timeline")}
          className="ml-auto">
          <TabsList className="h-9">
            <TabsTrigger value="board" className="text-xs sm:text-sm">Board</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "board" | "timeline")}
        className="flex-1 flex flex-col">
        <TabsContent value="board" className="flex-1">
          <div className="relative h-full overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="h-full overflow-auto">
              <div className="min-w-[720px] md:min-w-0">
                <PlannerBoard
                  date={selectedDate}
                  technicians={techniciansQuery.data ?? []}
                  appointments={appointmentsQuery.appointments}
                  activeBayId={selectedBayId}
                  isLoading={isLoading && !appointmentsQuery.appointments.length}
                  onAppointmentMove={appointmentsQuery.moveAppointment}
                  onAppointmentResize={appointmentsQuery.resizeAppointment}
                  onAppointmentClick={(id) => setActiveAppointmentId(id)}
                  onSlotCreate={({ technicianId, bayId, startsAt, endsAt }) =>
                    setDrawerState({ mode: "create", technicianId, bayId, startsAt, endsAt })
                  }
                  onStatusChange={({ id, status }) => appointmentsQuery.updateStatus(id, status)}
                  disableStatusActions={appointmentsQuery.isStatusMutating}
                  canSchedule={appointmentsQuery.canSchedule}
                  laneOverlays={laneOverlays}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="flex-1">
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <PlannerMobileTimeline
              date={selectedDate}
              appointments={appointmentsQuery.appointments}
              technicians={techniciansQuery.data ?? []}
              activeBayId={selectedBayId}
              isLoading={isLoading && !appointmentsQuery.appointments.length}
              onSelectAppointment={(id) => setActiveAppointmentId(id)}
              onCreate={({ startsAt, endsAt }) =>
                setDrawerState({ mode: "create", technicianId: null, bayId: selectedBayId, startsAt, endsAt })
              }
            />
          </div>
        </TabsContent>
      </Tabs>

      <EditAppointmentDrawer
        open={drawerState.mode !== "closed"}
        mode={drawerState.mode === "edit" ? "edit" : "create"}
        technicians={techniciansQuery.data ?? []}
        bays={bayOptions}
        appointment={
          drawerState.mode === "edit"
            ? appointmentsQuery.appointments.find((item) => item.id === drawerState.appointmentId)
            : undefined
        }
        defaults={
          drawerState.mode === "create"
            ? {
                technicianId: drawerState.technicianId,
                bayId: drawerState.bayId,
                startsAt: drawerState.startsAt,
                endsAt: drawerState.endsAt,
              }
            : null
        }
        isSubmitting={appointmentsQuery.isMutating}
        onClose={() => setDrawerState({ mode: "closed" })}
        onSubmit={async (values) => {
          try {
            const { technicianId, bayId, startsAt, endsAt } = values;
            const conflictFree = await appointmentsQuery.canSchedule({
              technicianId,
              bayId,
              startsAt,
              endsAt,
              appointmentId: drawerState.mode === "edit" ? drawerState.appointmentId : null,
            });

            if (!conflictFree) {
              toast({
                title: "Scheduling conflict",
                description: "This time overlaps with another appointment for the technician or bay.",
                variant: "destructive",
              });
              return;
            }

            if (drawerState.mode === "edit" && drawerState.appointmentId) {
              await appointmentsQuery.updateAppointment({
                id: drawerState.appointmentId,
                ...values,
              });
            } else if (drawerState.mode === "create") {
              await appointmentsQuery.createAppointment(values);
            }

            setDrawerState({ mode: "closed" });
          } catch (error) {
            const friendly = isFriendlyErrorMessage(error)
              ? error
              : mapErrorToFriendlyMessage(error, "saving the appointment");
            toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
          }
        }}
      />

      <AppointmentDialog
        open={Boolean(activeAppointmentId)}
        appointmentId={activeAppointmentId}
        appointment={dialogAppointment}
        technicians={techniciansQuery.data ?? []}
        bays={baysQuery.data ?? []}
        onClose={() => setActiveAppointmentId(null)}
        onEdit={() => {
          if (!activeAppointmentId) return;
          setDrawerState({ mode: "edit", appointmentId: activeAppointmentId });
          setActiveAppointmentId(null);
        }}
        onDelete={async () => {
          if (!activeAppointmentId) return;
          await appointmentsQuery.deleteAppointment(activeAppointmentId);
        }}
        onCancel={async (reason) => {
          if (!activeAppointmentId) return;
          await appointmentsQuery.cancelAppointment({ id: activeAppointmentId, reason });
        }}
        onSaveNotes={async (notes) => {
          if (!activeAppointmentId) return;
          await appointmentsQuery.updateNotes({ id: activeAppointmentId, notes });
        }}
        onConvertToWorkOrder={async () => {
          if (!activeAppointmentId) return;
          await appointmentsQuery.convertToWorkOrder(activeAppointmentId);
        }}
        isDeleting={appointmentsQuery.isDeleting}
        isCancelling={appointmentsQuery.isCancelling}
        isSavingNotes={appointmentsQuery.isSavingNotes}
        isConverting={appointmentsQuery.isConverting}
      />

      <ResourceManagementDrawer
        open={isResourceDrawerOpen}
        onClose={() => setIsResourceDrawerOpen(false)}
        technicians={techniciansQuery.data ?? []}
        bays={baysQuery.data ?? []}
        availability={resourceAvailability.availability}
        timeOff={resourceAvailability.timeOff}
        isLoading={resourceAvailability.isLoading}
        isMutating={resourceAvailability.isMutating}
        onCreateAvailability={resourceAvailability.createAvailability}
        onDeleteAvailability={resourceAvailability.deleteAvailability}
        onCreateTimeOff={resourceAvailability.createTimeOff}
        onDeleteTimeOff={resourceAvailability.deleteTimeOff}
      />
    </div>
  );
};

export default Planner;
