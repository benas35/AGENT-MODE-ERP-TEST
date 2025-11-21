import { describe, expect, it } from "vitest";
import { customerSchema, workOrderFormSchema } from "@/lib/validationSchemas";

describe("validation schemas", () => {
  it("sanitizes HTML in customer notes", () => {
    const parsed = customerSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      notes: "<script>alert('xss')</script>Call soon",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.notes).toBe("alert('xss')Call soon");
  });

  it("rejects work orders without line items", () => {
    const parsed = workOrderFormSchema.safeParse({
      title: "Brake job",
      customerId: crypto.randomUUID(),
      vehicleId: crypto.randomUUID(),
      priority: "normal",
      workflowStageId: crypto.randomUUID(),
      estimatedHours: 2,
      lineItems: [],
      assignment: {},
    });

    expect(parsed.success).toBe(false);
  });
});
