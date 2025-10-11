import { useMemo, useState } from "react";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarIcon, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlannerBoard } from "@/features/planner/PlannerBoard";
import {
  usePlannerAppointments,
  usePlannerBays,
  usePlannerTechnicians,
  type PlannerBay,
} from "@/features/planner/hooks";
import { EditAppointmentDrawer } from "@/features/planner/EditAppointmentDrawer";
import { ORG_TIMEZONE } from "@/features/planner/types";
import { toast } from "@/hooks/use-toast";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";

type DrawerState =
  | { mode: "closed" }
  | { mode: "create"; technicianId: string | null; bayId: string | null; startsAt: string; endsAt: string }
  | { mode: "edit"; appointmentId: string };

const Planner = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedBayId, setSelectedBayId] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: "closed" });

  const techniciansQuery = usePlannerTechnicians();
  const baysQuery = usePlannerBays();
  const appointmentsQuery = usePlannerAppointments(selectedDate, { bayId: selectedBayId });

  const isLoading = techniciansQuery.isLoading || appointmentsQuery.isLoading;
  const isMutating = appointmentsQuery.isMutating;

  const dateLabel = formatInTimeZone(selectedDate, ORG_TIMEZONE, "EEEE, MMM d");
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

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          <p className="text-sm text-muted-foreground">
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
      </div>

      <div className="relative flex-1 overflow-hidden rounded-lg border bg-card">
        <PlannerBoard
          date={selectedDate}
          technicians={techniciansQuery.data ?? []}
          appointments={appointmentsQuery.appointments}
          activeBayId={selectedBayId}
          isLoading={isLoading && !appointmentsQuery.appointments.length}
          onAppointmentMove={appointmentsQuery.moveAppointment}
          onAppointmentResize={appointmentsQuery.resizeAppointment}
          onAppointmentClick={(id) => setDrawerState({ mode: "edit", appointmentId: id })}
          onSlotCreate={({ technicianId, bayId, startsAt, endsAt }) =>
            setDrawerState({ mode: "create", technicianId, bayId, startsAt, endsAt })
          }
          canSchedule={appointmentsQuery.canSchedule}
        />
      </div>

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
            const friendly = mapErrorToFriendlyMessage(error, "saving the appointment");
            toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
          }
        }}
      />
    </div>
  );
};

export default Planner;
