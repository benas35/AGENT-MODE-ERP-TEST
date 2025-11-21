import { useMemo } from "react";
import { addMinutes, format } from "date-fns";
import { CalendarClock, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInOrgTimezone } from "@/lib/timezone";
import { PlannerAppointment, PlannerTechnician, PLANNER_STATUS_LABELS } from "./types";

interface PlannerMobileTimelineProps {
  date: Date;
  appointments: PlannerAppointment[];
  technicians: PlannerTechnician[];
  activeBayId?: string | null;
  isLoading?: boolean;
  onSelectAppointment?: (id: string) => void;
  onCreate?: (defaults: { startsAt: string; endsAt: string }) => void;
}

const statusChipStyles: Record<PlannerAppointment["status"], string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-900 border border-amber-300",
  waiting_parts: "bg-red-100 text-red-900 border border-red-300",
  completed: "bg-emerald-100 text-emerald-900 border border-emerald-300",
};

export function PlannerMobileTimeline({
  date,
  appointments,
  technicians,
  activeBayId = null,
  isLoading = false,
  onSelectAppointment,
  onCreate,
}: PlannerMobileTimelineProps) {
  const filteredAppointments = useMemo(
    () =>
      (activeBayId ? appointments.filter((item) => item.bayId === activeBayId) : appointments).sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      ),
    [activeBayId, appointments]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, { technician: PlannerTechnician | null; items: PlannerAppointment[] }>();
    for (const appointment of filteredAppointments) {
      const technician = technicians.find((tech) => tech.id === appointment.technicianId) ?? null;
      const key = technician?.id ?? "unassigned";
      const existing = groups.get(key) ?? { technician, items: [] };
      existing.items.push(appointment);
      groups.set(key, existing);
    }
    return Array.from(groups.values());
  }, [filteredAppointments, technicians]);

  const handleCreate = () => {
    if (!onCreate) return;
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = addMinutes(start, 60);
    onCreate({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Mobile timeline</p>
          <p className="text-base font-semibold">{format(date, "EEEE, MMM d")}</p>
        </div>
        {onCreate ? (
          <Button size="sm" variant="outline" onClick={handleCreate} className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Quick book
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Card key={`planner-mobile-skeleton-${index}`} className="shadow-sm">
              <CardHeader className="space-y-1 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && filteredAppointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No appointments scheduled for this view.</p>
      ) : null}

      <div className="space-y-3">
        {grouped.map(({ technician, items }) => (
          <Card key={technician?.id ?? "unassigned"} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold leading-none">
                  {technician?.name ?? "Unassigned"}
                </CardTitle>
                {technician?.specialty ? (
                  <p className="text-xs text-muted-foreground">{technician.specialty}</p>
                ) : null}
              </div>
              {technician?.phone ? (
                <Badge variant="secondary" className="gap-1">
                  <Phone className="h-3 w-3" />
                  {technician.phone}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((appointment) => (
                <button
                  key={appointment.id}
                  className="w-full rounded-lg border bg-muted/40 p-3 text-left transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => onSelectAppointment?.(appointment.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold leading-tight">{appointment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInOrgTimezone(appointment.startsAt, "HH:mm")} – {formatInOrgTimezone(appointment.endsAt, "HH:mm")} ({
                          appointment.vehicleLabel ?? "Vehicle TBD"
                        })
                      </p>
                    </div>
                    <Badge className={statusChipStyles[appointment.status]}>
                      {PLANNER_STATUS_LABELS[appointment.status]}
                    </Badge>
                  </div>
                  {appointment.customerName ? (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{appointment.customerName}</span>
                    </div>
                  ) : null}
                  {appointment.notes ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{appointment.notes}</p>
                  ) : null}
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
