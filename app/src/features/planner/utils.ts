import { addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { MIN_SLOT_MINUTES, PlannerAppointment } from "./types";
import { orgZonedTimeToUtcIso, toOrgZonedTime } from "@/lib/timezone";

export interface BoardWindow {
  start: Date;
  end: Date;
}

export const minuteHeight = 2;

export const toZoned = (iso: string | Date): Date =>
  toOrgZonedTime(typeof iso === "string" ? new Date(iso) : iso);

export const toUtcIso = (date: Date): string => orgZonedTimeToUtcIso(date);

export const snapMinutes = (minutes: number): number =>
  Math.round(minutes / MIN_SLOT_MINUTES) * MIN_SLOT_MINUTES;

export const getBoardWindow = (day: Date, appointments: PlannerAppointment[]): BoardWindow => {
  const zonedDay = toZoned(day);
  const dayStart = startOfDay(zonedDay);

  const fallbackStart = 8 * 60; // 08:00
  const fallbackEnd = 18 * 60; // 18:00
  const minBound = 6 * 60;
  const maxBound = 20 * 60;

  if (appointments.length === 0) {
    return {
      start: addMinutes(dayStart, fallbackStart),
      end: addMinutes(dayStart, fallbackEnd),
    };
  }

  let earliest = fallbackStart;
  let latest = fallbackEnd;

  for (const appointment of appointments) {
    const startMinutes = differenceInMinutes(toZoned(appointment.startsAt), dayStart);
    const endMinutes = differenceInMinutes(toZoned(appointment.endsAt), dayStart);
    earliest = Math.min(earliest, startMinutes);
    latest = Math.max(latest, endMinutes);
  }

  const startMinutes = Math.max(minBound, snapMinutes(earliest) - MIN_SLOT_MINUTES);
  const endMinutes = Math.max(
    startMinutes + MIN_SLOT_MINUTES,
    Math.min(maxBound, snapMinutes(latest) + MIN_SLOT_MINUTES)
  );

  return {
    start: addMinutes(dayStart, startMinutes),
    end: addMinutes(dayStart, endMinutes),
  };
};

export const timeToPixels = (date: Date, start: Date): number =>
  Math.max(0, differenceInMinutes(date, start) * minuteHeight);

export const pixelsToTime = (pixels: number, start: Date): Date => {
  const minutes = snapMinutes(pixels / minuteHeight);
  return addMinutes(start, minutes);
};
