import { useEffect, useMemo, useState } from "react";
import { differenceInMinutes, formatDistanceStrict } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { formatInOrgTimezone } from "@/lib/timezone";
import { supabase } from "@/integrations/supabase/client";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";
import type { PlannerAppointment, PlannerTechnician } from "./types";
import type { PlannerBay } from "./hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface AppointmentDialogProps {
  open: boolean;
  appointmentId: string | null;
  appointment: PlannerAppointment | null;
  technicians: PlannerTechnician[];
  bays: PlannerBay[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onCancel: (reason: string | null) => Promise<void>;
  onSaveNotes: (notes: string | null) => Promise<void>;
  onConvertToWorkOrder: () => Promise<void>;
  isDeleting?: boolean;
  isCancelling?: boolean;
  isSavingNotes?: boolean;
  isConverting?: boolean;
}

interface AppointmentDetails {
  id: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  vehicle: {
    label: string | null;
    vin: string | null;
    year: number | null;
  } | null;
  services: {
    id: string;
    description: string;
    estimatedMinutes: number | null;
    quantity: number | null;
  }[];
}

interface AppointmentConflictRow {
  conflict_appointment_id: string;
  conflict_title: string;
  resource_name: string;
  overlap_start: string;
  overlap_end: string;
}

const mapDetailsRow = (row: any): AppointmentDetails => {
  const customerRow = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const vehicleRow = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
  const servicesRows = Array.isArray(row.appointment_services)
    ? row.appointment_services
    : row.appointment_services
    ? [row.appointment_services]
    : [];

  return {
    id: row.id,
    description: row.description ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    customer: customerRow
      ? {
          name: `${customerRow.first_name ?? ""} ${customerRow.last_name ?? ""}`.trim() || null,
          email: customerRow.email ?? null,
          phone: customerRow.phone ?? null,
        }
      : null,
    vehicle: vehicleRow
      ? {
          label:
            [vehicleRow.make, vehicleRow.model, vehicleRow.license_plate].filter(Boolean).join(" ") || null,
          vin: vehicleRow.vin ?? null,
          year: vehicleRow.year ?? null,
        }
      : null,
    services: servicesRows.map((service: any) => ({
      id: service.id ?? `${row.id}-${service.sort_order ?? 0}`,
      description: service.description ?? "Service",
      estimatedMinutes: service.estimated_minutes ?? null,
      quantity: service.quantity ?? null,
    })),
  };
};

const useAppointmentDetails = (appointmentId: string | null, open: boolean) => {
  return useQuery<AppointmentDetails | null>({
    enabled: open && Boolean(appointmentId),
    queryKey: ["planner", "appointment", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
            id, description, created_at, updated_at,
            customers:customers(first_name,last_name,email,phone),
            vehicles:vehicles(make,model,license_plate,vin,year),
            appointment_services(id, description, estimated_minutes, quantity, sort_order)
          `
        )
        .eq("id", appointmentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return mapDetailsRow(data);
    },
    staleTime: 2 * 60 * 1000,
  });
};

const useAppointmentConflicts = (appointmentId: string | null, open: boolean) => {
  return useQuery<AppointmentConflictRow[]>({
    enabled: open && Boolean(appointmentId),
    queryKey: ["planner", "appointment-conflicts", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];

      const { data, error } = await supabase.rpc("check_appointment_conflicts", {
        p_appointment_id: appointmentId,
      });

      if (error) {
        throw error;
      }

      return (data as AppointmentConflictRow[]) ?? [];
    },
  });
};

export const AppointmentDialog = ({
  open,
  appointmentId,
  appointment,
  technicians,
  bays,
  onClose,
  onEdit,
  onDelete,
  onCancel,
  onSaveNotes,
  onConvertToWorkOrder,
  isDeleting = false,
  isCancelling = false,
  isSavingNotes = false,
  isConverting = false,
}: AppointmentDialogProps) => {
  const detailsQuery = useAppointmentDetails(appointmentId, open);
  const conflictsQuery = useAppointmentConflicts(appointmentId, open);

  const [noteDraft, setNoteDraft] = useState<string>(appointment?.notes ?? "");
  const [isDeletingConfirmOpen, setIsDeletingConfirmOpen] = useState(false);
  const [isCancellingConfirmOpen, setIsCancellingConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (open) {
      setNoteDraft(appointment?.notes ?? "");
      setCancelReason("");
    }
  }, [open, appointment?.notes]);

  const technicianName = useMemo(() => {
    if (!appointment?.technicianId) return "Unassigned";
    return (
      technicians.find((technician) => technician.id === appointment.technicianId)?.name ?? "Unassigned"
    );
  }, [appointment?.technicianId, technicians]);

  const bayName = useMemo(() => {
    if (!appointment?.bayId) return "No bay";
    return bays.find((bay) => bay.id === appointment.bayId)?.name ?? "No bay";
  }, [appointment?.bayId, bays]);

  const scheduleSummary = useMemo(() => {
    if (!appointment) return null;
    const start = formatInOrgTimezone(appointment.startsAt, "MMM d, yyyy HH:mm");
    const end = formatInOrgTimezone(appointment.endsAt, "HH:mm");
    const durationMinutes = differenceInMinutes(new Date(appointment.endsAt), new Date(appointment.startsAt));
    return {
      start,
      end,
      duration: durationMinutes,
      durationLabel: formatDistanceStrict(new Date(appointment.startsAt), new Date(appointment.endsAt)),
    };
  }, [appointment]);

  const details = detailsQuery.data ?? null;

  const conflicts = conflictsQuery.data ?? [];
  const hasConflicts = conflicts.length > 0;

  const handleSaveNotes = async () => {
    try {
      await onSaveNotes(noteDraft.trim() ? noteDraft.trim() : null);
      toast({ title: "Notes saved", description: "Appointment notes were updated." });
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "saving notes");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }
  };

  const handleConvert = async () => {
    try {
      const workOrderId = await onConvertToWorkOrder();
      toast({
        title: "Work order created",
        description: "The appointment was converted to a work order.",
      });
      return workOrderId;
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "creating a work order");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete();
      toast({ title: "Appointment deleted", description: "The appointment has been removed." });
      setIsDeletingConfirmOpen(false);
      onClose();
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "deleting the appointment");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    try {
      await onCancel(cancelReason.trim() ? cancelReason.trim() : null);
      toast({ title: "Appointment cancelled", description: "The appointment status was updated." });
      setIsCancellingConfirmOpen(false);
      onClose();
    } catch (error) {
      const friendly = mapErrorToFriendlyMessage(error, "cancelling the appointment");
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    }
  };

  const isBusy = isDeleting || isCancelling || isSavingNotes || isConverting;
  const isDirty = (appointment?.notes ?? "") !== noteDraft;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
        <DialogContent className="max-w-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-2">
              <span>{appointment?.title ?? "Appointment"}</span>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-medium uppercase tracking-wide">
                  {appointment?.status.replace(/_/g, " ") ?? "scheduled"}
                </Badge>
                {scheduleSummary ? (
                  <span>
                    {scheduleSummary.start} – {scheduleSummary.end} ({scheduleSummary.durationLabel})
                  </span>
                ) : null}
              </div>
            </DialogTitle>
            <DialogDescription>
              Manage appointment details, notes, and downstream actions without leaving the planner.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {hasConflicts ? (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>Scheduling conflict</AlertTitle>
                  <AlertDescription className="space-y-2 text-sm">
                    <p>
                      This appointment overlaps with other bookings. Resolve the conflict to ensure resource availability.
                    </p>
                    <ul className="space-y-1">
                      {conflicts.map((conflict) => (
                        <li key={`${conflict.conflict_appointment_id}-${conflict.resource_name}`}>
                          <span className="font-medium">{conflict.resource_name}:</span>{" "}
                          {formatInOrgTimezone(conflict.overlap_start, "HH:mm")} –
                          {" "}
                          {formatInOrgTimezone(conflict.overlap_end, "HH:mm")} with {conflict.conflict_title}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Technician</p>
                  <p className="text-sm font-medium">{technicianName}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Bay</p>
                  <p className="text-sm font-medium">{bayName}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Customer & vehicle</h3>
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{details?.customer?.name ?? appointment?.customerName ?? "Not linked"}</p>
                    {details?.customer?.email ? <p>{details.customer.email}</p> : null}
                    {details?.customer?.phone ? <p>{details.customer.phone}</p> : null}
                  </div>
                  <Separator />
                  <div>
                    <p className="font-medium text-foreground">{details?.vehicle?.label ?? appointment?.vehicleLabel ?? "No vehicle"}</p>
                    {details?.vehicle?.vin ? <p>VIN: {details.vehicle.vin}</p> : null}
                    {details?.vehicle?.year ? <p>Year: {details.vehicle.year}</p> : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Internal notes</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNoteDraft(appointment?.notes ?? "")}
                      disabled={!isDirty || isSavingNotes}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={!isDirty || isSavingNotes}
                    >
                      {isSavingNotes ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={4}
                  placeholder="Add notes for technicians or service advisors"
                  disabled={isSavingNotes}
                />
              </div>

              {details?.description ? (
                <div>
                  <h3 className="text-sm font-semibold">Customer request</h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{details.description}</p>
                </div>
              ) : null}

              {details?.services.length ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Planned services</h3>
                  <div className="space-y-2 text-sm">
                    {details.services.map((service) => (
                      <div key={service.id} className="rounded-md border p-3">
                        <p className="font-medium text-foreground">{service.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {service.quantity != null ? <span>Qty: {service.quantity}</span> : null}
                          {service.estimatedMinutes != null ? <span>Est. {service.estimatedMinutes} min</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {details?.createdAt || details?.updatedAt ? (
                <div className="text-xs text-muted-foreground">
                  {details?.createdAt ? (
                    <p>Created {formatInOrgTimezone(details.createdAt, "MMM d, yyyy HH:mm")}</p>
                  ) : null}
                  {details?.updatedAt ? (
                    <p>Updated {formatInOrgTimezone(details.updatedAt, "MMM d, yyyy HH:mm")}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onEdit} disabled={isBusy || !appointment}>
                Edit appointment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancellingConfirmOpen(true)}
                disabled={isBusy || !appointment}
              >
                Cancel appointment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeletingConfirmOpen(true)}
                disabled={isBusy || !appointment}
              >
                Delete
              </Button>
            </div>
            <Button type="button" onClick={handleConvert} disabled={isBusy || !appointment}>
              {isConverting ? "Converting…" : "Convert to work order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isDeletingConfirmOpen}
        onOpenChange={setIsDeletingConfirmOpen}
        onConfirm={handleDelete}
        title="Delete appointment"
        description="This action permanently removes the appointment and its associated services."
        confirmText="Delete"
        cancelText="Keep appointment"
        variant="destructive"
        loading={isDeleting}
      />

      <AlertDialog open={isCancellingConfirmOpen} onOpenChange={setIsCancellingConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Provide an optional reason for cancelling this appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Optional cancellation reason"
            className="mt-2"
            disabled={isCancelling}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentDialog;
