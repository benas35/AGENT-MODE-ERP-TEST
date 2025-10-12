import { describe, expect, it, vi } from "vitest";
import { z, stringNonEmpty, safeSubmit } from "@/lib/validation";

describe("validation helpers", () => {
  it("accepts valid values", () => {
    const schema = z.object({ name: stringNonEmpty("Name is required") });
    const result = schema.safeParse({ name: "Engine" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid values", () => {
    const schema = z.object({ name: stringNonEmpty("Name is required") });
    const result = schema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toEqual(["Name is required"]);
    }
  });

  it("wraps submit handlers and reports errors", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const onError = vi.fn();
    const wrapped = safeSubmit(handler, { onError });

    await wrapped({ name: "Engine" } as any, undefined);

    expect(handler).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { name: "Engine" });
  });
});
