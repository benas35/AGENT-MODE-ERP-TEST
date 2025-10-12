import { addMinutes } from "date-fns";
import { describe, expect, it } from "vitest";

import { minuteHeight, pixelsToTime, snapMinutes, timeToPixels } from "../utils";

describe("planner time helpers", () => {
  const base = new Date("2024-05-01T08:00:00Z");

  it("converts time to pixels with minute precision", () => {
    const target = addMinutes(base, 45);
    expect(timeToPixels(target, base)).toBe(45 * minuteHeight);
  });

  it("never returns negative pixels", () => {
    const earlier = addMinutes(base, -30);
    expect(timeToPixels(earlier, base)).toBe(0);
  });

  it("snaps minutes to the nearest slot", () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(22)).toBe(15);
    expect(snapMinutes(44)).toBe(45);
  });

  it("converts pixels back to snapped time", () => {
    const pixels = minuteHeight * 43; // 43 minutes worth of pixels
    const snapped = pixelsToTime(pixels, base);
    expect(snapped.toISOString()).toBe(addMinutes(base, 45).toISOString());
  });
});
