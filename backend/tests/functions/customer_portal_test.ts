import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "https://example.supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("SUPABASE_JWT_SECRET", "secret");
Deno.env.set("PORTAL_MAGIC_LINK_BASE_URL", "https://portal.example.com/session");

const { handler } = await import("../../edge-functions/customer-portal/index.ts");

Deno.test("customer portal rejects non POST methods", async () => {
  const res = await handler(new Request("https://example.com", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("customer portal validates generate payload", async () => {
  const res = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_link", email: "" }),
    }),
  );
  assertEquals(res.status, 400);
});

Deno.test("customer portal requires token for verification", async () => {
  const res = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_token" }),
    }),
  );
  assertEquals(res.status, 400);
});
