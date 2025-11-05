import { describe, expect, it } from "vitest";

import {
  applyCreateSuccess,
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyStatusUpdate,
  applyUpdateSuccess,
  revertAppointments,
  sortAppointments,
} from "../reducer";
import type { PlannerAppointment } from "../types";

type PartialAppointment = Partial<Omit<PlannerAppointment, "startsAt" | "endsAt" | "status">> & {
  startsAtOffset: number;
  duration: number;
  status?: PlannerAppointment["status"];
};

const baseStart = new Date("2024-05-01T08:00:00Z");

const buildAppointment = (id: string, config: PartialAppointment): PlannerAppointment => {
  const startsAt = new Date(baseStart.getTime() + config.startsAtOffset * 60_000);
  const endsAt = new Date(startsAt.getTime() + config.duration * 60_000);
  return {
    id,
    title: config.title ?? `Appointment ${id}`,
    technicianId: config.technicianId ?? "tech-1",
    bayId: config.bayId ?? null,
    status: config.status ?? "scheduled",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    notes: config.notes ?? null,
    customerId: config.customerId ?? null,
    customerName: config.customerName ?? null,
    vehicleId: config.vehicleId ?? null,
    vehicleLabel: config.vehicleLabel ?? null,
    priority: config.priority ?? 0,
  };
};

describe("planner reducers", () => {
  const first = buildAppointment("a", { startsAtOffset: 0, duration: 60 });
  const second = buildAppointment("b", { startsAtOffset: 120, duration: 60 });

  it("sorts appointments chronologically", () => {
    const sorted = sortAppointments([second, first]);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });

  it("applies optimistic create respecting bay filter", () => {
    const optimistic = buildAppointment("temp", {
      startsAtOffset: 60,
      duration: 60,
      bayId: "bay-1",
    });

    const withoutFilter = applyOptimisticCreate([first, second], optimistic, null);
    expect(withoutFilter.map((appt) => appt.id)).toEqual(["a", "temp", "b"]);

    const withFilter = applyOptimisticCreate([first, second], optimistic, "bay-2");
    expect(withFilter.map((appt) => appt.id)).toEqual(["a", "b"]);
  });

  it("replaces temporary appointment on success", () => {
    const optimistic = buildAppointment("temp", {
      startsAtOffset: 60,
      duration: 60,
    });
    const optimisticState = applyOptimisticCreate([first], optimistic, null);
    const actual = { ...optimistic, id: "real" };

    const committed = applyCreateSuccess(optimisticState, "temp", actual, null);
    expect(committed.map((appt) => appt.id)).toEqual(["a", "real"]);
  });

  it("updates appointments while keeping order", () => {
    const updated = buildAppointment("a", { startsAtOffset: 150, duration: 60 });
    const state = applyOptimisticUpdate([first, second], updated, null);
    expect(state.map((appt) => appt.id)).toEqual(["b", "a"]);

    const success = applyUpdateSuccess(state, updated, null);
    expect(success.map((appt) => appt.id)).toEqual(["b", "a"]);
  });

  it("applies status changes immutably", () => {
    const original = [first, second];
    const statusUpdated = applyStatusUpdate(original, "b", "completed");
    expect(statusUpdated.find((appt) => appt.id === "b")?.status).toBe("completed");
    expect(statusUpdated.find((appt) => appt.id === "a")?.status).toBe("scheduled");
    expect(statusUpdated).not.toBe(original);
    expect(statusUpdated[0]).not.toBe(original[0]);
  });

  it("clones previous state on revert", () => {
    const original = [first, second];
    const reverted = revertAppointments(original);
    expect(reverted).toEqual(original);
    expect(reverted).not.toBe(original);
    expect(reverted[0]).not.toBe(original[0]);
  });
});
