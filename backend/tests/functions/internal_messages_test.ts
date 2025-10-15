import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");

const { handler } = await import("../../edge-functions/internal-messages/index.ts");

Deno.test("rejects unsupported methods", async () => {
  const response = await handler(new Request("https://example.com", { method: "GET" }));
  assertEquals(response.status, 405);
});

Deno.test("acknowledges typing payloads", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "typing" }),
    }),
  );
  assertEquals(response.status, 202);
});

Deno.test("validates required fields for read receipts", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "read", orgId: "org" }),
    }),
  );
  assertEquals(response.status, 400);
});

Deno.test("validates required fields for send payloads", async () => {
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "send", body: "", orgId: "" }),
    }),
  );
  assertEquals(response.status, 400);
});
