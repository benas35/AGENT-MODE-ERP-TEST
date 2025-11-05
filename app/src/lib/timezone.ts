import { addDays, startOfDay } from "date-fns";

export type DateInput = Date | string | number;

const DEFAULT_LOCALE = "en-US";
export const ORG_TIMEZONE = "Europe/Vilnius";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function ensureDate(input: DateInput): Date {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  return new Date(input);
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `${timeZone}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

function getParts(date: Date, timeZone: string): ZonedParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const lookup = new Map<Intl.DateTimeFormatPartTypes, string>();
  for (const part of parts) {
    if (part.type === "literal") continue;
    const existing = lookup.get(part.type as Intl.DateTimeFormatPartTypes);
    lookup.set(part.type as Intl.DateTimeFormatPartTypes, existing ? `${existing}${part.value}` : part.value);
  }

  const fractional = lookup.get("fractionalSecond") ?? "0";
  const normalizedFraction = fractional.padEnd(3, "0").slice(0, 3);

  const year = Number(lookup.get("year"));
  const month = Number(lookup.get("month"));
  const day = Number(lookup.get("day"));
  const hour = Number(lookup.get("hour"));
  const minute = Number(lookup.get("minute"));
  const second = Number(lookup.get("second"));
  const millisecond = Number(normalizedFraction);

  return { year, month, day, hour, minute, second, millisecond };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second, millisecond } = getParts(date, timeZone);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  return (asUtc - date.getTime()) / 60000;
}

function toZonedTime(dateInput: DateInput, timeZone: string): Date {
  const date = ensureDate(dateInput);
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }

  const { year, month, day, hour, minute, second, millisecond } = getParts(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
}

function fromZonedTime(dateInput: DateInput, timeZone: string): Date {
  const date = ensureDate(dateInput);
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }

  const offsetMinutes = getTimezoneOffsetMinutes(date, timeZone);
  const utcMillis = date.getTime() - offsetMinutes * 60_000;
  return new Date(utcMillis);
}

function parseLocalDateTime(localValue: string): Date {
  if (!localValue) return new Date(NaN);

  const [datePart, timePart = "00:00"] = localValue.split("T");
  const [year, month, day] = datePart.split("-").map((token) => Number(token));
  const [hour = 0, minute = 0] = timePart.split(":").map((token) => Number(token));

  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return new Date(NaN);
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

export function formatInOrgTimezone(
  input: DateInput,
  token: "HH:mm" | "yyyy-MM-dd" | "yyyy-MM-dd'T'HH:mm" | "EEEE, MMM d"
): string {
  const zoned = toZonedTime(input, ORG_TIMEZONE);
  if (Number.isNaN(zoned.getTime())) return "";

  switch (token) {
    case "HH:mm":
      return `${pad(zoned.getUTCHours())}:${pad(zoned.getUTCMinutes())}`;
    case "yyyy-MM-dd":
      return `${zoned.getUTCFullYear()}-${pad(zoned.getUTCMonth() + 1)}-${pad(zoned.getUTCDate())}`;
    case "yyyy-MM-dd'T'HH:mm":
      return `${zoned.getUTCFullYear()}-${pad(zoned.getUTCMonth() + 1)}-${pad(zoned.getUTCDate())}T${pad(zoned.getUTCHours())}:${pad(zoned.getUTCMinutes())}`;
    case "EEEE, MMM d": {
      const baseDate = ensureDate(input);
      if (Number.isNaN(baseDate.getTime())) return "";
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        timeZone: ORG_TIMEZONE,
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(baseDate);
    }
    default:
      return `${zoned.toISOString()}`;
  }
}

export function toOrgZonedTime(input: DateInput): Date {
  return toZonedTime(input, ORG_TIMEZONE);
}

export function orgZonedTimeToUtc(dateInput: DateInput): Date {
  return fromZonedTime(dateInput, ORG_TIMEZONE);
}

export function orgZonedTimeToUtcIso(dateInput: DateInput): string {
  return orgZonedTimeToUtc(dateInput).toISOString();
}

export function toOrgLocalInput(iso: string): string {
  return formatInOrgTimezone(iso, "yyyy-MM-dd'T'HH:mm");
}

export function fromOrgLocalInput(localValue: string): string {
  const parsed = parseLocalDateTime(localValue);
  return orgZonedTimeToUtc(parsed).toISOString();
}

export function getOrgDateKey(date: Date): string {
  return formatInOrgTimezone(date, "yyyy-MM-dd");
}

export function getOrgDateRange(date: Date): { start: string; end: string } {
  const zoned = toOrgZonedTime(date);
  const start = startOfDay(zoned);
  const end = addDays(start, 1);
  return {
    start: orgZonedTimeToUtcIso(start),
    end: orgZonedTimeToUtcIso(end),
  };
}

export function getOrgTimezoneOffsetMinutes(date: Date): number {
  return getTimezoneOffsetMinutes(date, ORG_TIMEZONE);
}
