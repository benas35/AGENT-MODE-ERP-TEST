export type PlannerStatus = "scheduled" | "in_progress" | "waiting_parts" | "completed";

export interface PlannerTechnician {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  skills: string[];
}

export interface PlannerAppointment {
  id: string;
  title: string;
  technicianId: string | null;
  bayId: string | null;
  status: PlannerStatus;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  customerId: string | null;
  customerName: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  priority: number;
}

export interface PlannerMovePayload {
  id: string;
  technicianId: string | null;
  bayId: string | null;
  startsAt: string;
  endsAt: string;
}

export interface PlannerResizePayload {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface CanScheduleInput {
  technicianId: string | null;
  bayId: string | null;
  startsAt: string;
  endsAt: string;
  appointmentId?: string | null;
}

export const ORG_TIMEZONE = "Europe/Vilnius";
export const MIN_SLOT_MINUTES = 15;
export const DEFAULT_APPOINTMENT_MINUTES = 60;

export interface PlannerEditableFields {
  title: string;
  technicianId: string | null;
  bayId: string | null;
  status: PlannerStatus;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  customerId: string | null;
  customerName: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
}

export interface PlannerUpdatePayload extends PlannerEditableFields {
  id: string;
}
