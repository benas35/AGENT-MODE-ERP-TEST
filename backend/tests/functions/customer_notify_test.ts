import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

const { handler } = await import("../../edge-functions/customer-notify/index.ts");

Deno.test("customer notify rejects non POST", async () => {
  const res = await handler(new Request("https://example.com", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("customer notify validates json payload", async () => {
  const res = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }),
  );
  assertEquals(res.status, 400);
});

Deno.test("customer notify requires identifiers", async () => {
  const res = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "status" }),
    }),
  );
  assertEquals(res.status, 400);
});
