import { PlannerAppointment, PlannerStatus } from "./types";

const clone = (items: PlannerAppointment[]): PlannerAppointment[] =>
  items.map((item) => ({ ...item }));

export const sortAppointments = (items: PlannerAppointment[]): PlannerAppointment[] =>
  [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

export const applyOptimisticCreate = (
  current: PlannerAppointment[],
  appointment: PlannerAppointment,
  bayFilter: string | null
): PlannerAppointment[] => {
  if (bayFilter && appointment.bayId !== bayFilter) {
    return clone(current);
  }
  return sortAppointments([...current, appointment]);
};

export const applyCreateSuccess = (
  current: PlannerAppointment[],
  temporaryId: string | undefined,
  actual: PlannerAppointment,
  bayFilter: string | null
): PlannerAppointment[] => {
  const withoutTemp = current.filter((item) => item.id !== temporaryId);
  if (bayFilter && actual.bayId !== bayFilter) {
    return clone(withoutTemp);
  }
  return sortAppointments([...withoutTemp, actual]);
};

export const applyOptimisticUpdate = (
  current: PlannerAppointment[],
  appointment: PlannerAppointment,
  bayFilter: string | null
): PlannerAppointment[] => {
  const remaining = current.filter((item) => item.id !== appointment.id);
  if (bayFilter && appointment.bayId !== bayFilter) {
    return clone(remaining);
  }
  return sortAppointments([...remaining, appointment]);
};

export const applyUpdateSuccess = (
  current: PlannerAppointment[],
  actual: PlannerAppointment,
  bayFilter: string | null
): PlannerAppointment[] => {
  const remaining = current.filter((item) => item.id !== actual.id);
  if (bayFilter && actual.bayId !== bayFilter) {
    return clone(remaining);
  }
  return sortAppointments([...remaining, actual]);
};

export const applyStatusUpdate = (
  current: PlannerAppointment[],
  id: string,
  status: PlannerStatus
): PlannerAppointment[] =>
  current.map((item) => (item.id === id ? { ...item, status } : { ...item }));

export const revertAppointments = (previous: PlannerAppointment[]): PlannerAppointment[] =>
  clone(previous);
