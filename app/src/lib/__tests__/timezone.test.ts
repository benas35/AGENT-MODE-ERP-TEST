import { describe, expect, it } from "vitest";

import {
  formatInOrgTimezone,
  toOrgLocalInput,
  fromOrgLocalInput,
  toOrgZonedTime,
  orgZonedTimeToUtcIso,
} from "@/lib/timezone";

const SAMPLE_ISO = "2024-05-01T08:30:00.000Z"; // 11:30 local in Europe/Vilnius (+3 in May)

describe("timezone helpers", () => {
  it("formats times in the organisation timezone", () => {
    expect(formatInOrgTimezone(SAMPLE_ISO, "HH:mm")).toBe("11:30");
    expect(formatInOrgTimezone(SAMPLE_ISO, "yyyy-MM-dd")).toBe("2024-05-01");
  });

  it("generates datetime-local inputs from ISO strings", () => {
    expect(toOrgLocalInput(SAMPLE_ISO)).toBe("2024-05-01T11:30");
  });

  it("converts local datetime inputs back to UTC ISO strings", () => {
    expect(fromOrgLocalInput("2024-05-01T11:30")).toBe("2024-05-01T08:30:00.000Z");
  });

  it("roundtrips zoned conversions", () => {
    const zoned = toOrgZonedTime(SAMPLE_ISO);
    expect(zoned.getUTCFullYear()).toBe(2024);
    expect(zoned.getUTCMonth()).toBe(4);
    expect(zoned.getUTCDate()).toBe(1);
    expect(zoned.getUTCHours()).toBe(11);
    expect(zoned.getUTCMinutes()).toBe(30);
    expect(orgZonedTimeToUtcIso(zoned)).toBe(SAMPLE_ISO);
  });
});
