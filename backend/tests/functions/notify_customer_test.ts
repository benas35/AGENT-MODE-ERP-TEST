import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-test-key");

const { handler } = await import("../../edge-functions/notify-customer/index.ts");

Deno.test("rejects unsupported methods", async () => {
  const response = await handler(new Request("https://example.com", { method: "GET" }));
  assertEquals(response.status, 405);
});

Deno.test("requires context identifiers", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
  assertEquals(response.status, 400);
});

Deno.test("ignores non-issue categories", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "org",
        workOrderId: "wo",
        mediaId: "media",
        category: "progress",
      }),
    }),
  );
  assertEquals(response.status, 202);
  const payload = await response.json();
  assertEquals(payload.status, "ignored");
});

Deno.test("accepts mock context payload", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "org",
        workOrderId: "wo",
        mediaId: "media",
        category: "issue",
        mockContext: {
          customerEmail: "customer@example.com",
          customerPhone: "+1000000000",
          customerName: "Pat Taylor",
          workOrderNumber: "WO-1",
          approvalUrl: "https://portal.example.com/approve",
        },
      }),
    }),
  );
  assertEquals(response.status, 202);
  const payload = await response.json();
  assertMatch(payload.status, /queued/);
});
