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
  customerName: string | null;
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
}

export const ORG_TIMEZONE = "Europe/Vilnius";
export const MIN_SLOT_MINUTES = 15;
