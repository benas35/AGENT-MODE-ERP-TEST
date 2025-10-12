import { describe, expect, it } from "vitest";

import {
  applyCreateSuccess,
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyUpdateSuccess,
  revertAppointments,
} from "../reducer";
import type { PlannerAppointment } from "../types";

const makeAppointment = (id: string, startsAt: string, endsAt: string): PlannerAppointment => ({
  id,
  title: `Appt ${id}`,
  technicianId: "tech-1",
  bayId: null,
  status: "scheduled",
  startsAt,
  endsAt,
  notes: null,
  customerId: null,
  customerName: null,
  vehicleId: null,
  vehicleLabel: null,
  priority: 0,
});

describe("planner mutation flows", () => {
  const eight = "2024-05-01T08:00:00.000Z";
  const nine = "2024-05-01T09:00:00.000Z";
  const ten = "2024-05-01T10:00:00.000Z";

  it("restores cache when create mutation fails", () => {
    const previous = [makeAppointment("a", eight, nine)];
    const optimistic = makeAppointment("temp", nine, ten);

    const optimisticState = applyOptimisticCreate(previous, optimistic, null);
    expect(optimisticState.map((appt) => appt.id)).toEqual(["a", "temp"]);

    const rolledBack = revertAppointments(previous);
    expect(rolledBack).toEqual(previous);
    expect(rolledBack).not.toBe(previous);
  });

  it("replaces temporary records on create success", () => {
    const previous = [makeAppointment("a", eight, nine)];
    const temp = makeAppointment("temp", nine, ten);
    const optimisticState = applyOptimisticCreate(previous, temp, null);
    const actual = { ...temp, id: "b" };

    const committed = applyCreateSuccess(optimisticState, "temp", actual, null);
    expect(committed.map((appt) => appt.id)).toEqual(["a", "b"]);
  });

  it("rolls back update mutations to previous snapshot", () => {
    const previous = [makeAppointment("a", eight, nine), makeAppointment("b", nine, ten)];
    const moved = { ...previous[0], startsAt: nine, endsAt: ten };
    const optimisticState = applyOptimisticUpdate(previous, moved, null);
    expect(optimisticState.map((appt) => appt.id)).toEqual(["b", "a"]);

    const rolledBack = revertAppointments(previous);
    expect(rolledBack).toEqual(previous);
    expect(rolledBack).not.toBe(previous);
  });

  it("applies update success after optimistic move", () => {
    const previous = [makeAppointment("a", eight, nine), makeAppointment("b", nine, ten)];
    const moved = { ...previous[0], startsAt: nine, endsAt: ten };
    const optimisticState = applyOptimisticUpdate(previous, moved, null);
    const committed = applyUpdateSuccess(optimisticState, moved, null);

    expect(committed.map((appt) => appt.id)).toEqual(["b", "a"]);
  });
});
