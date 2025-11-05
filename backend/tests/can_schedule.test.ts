import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const connectionString =
  Deno.env.get("DATABASE_URL") ?? Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("SUPABASE_DB_CONNECTION_STRING");

const ignoreTest = !connectionString;

Deno.test({
  name: "can_schedule prevents overlapping appointments for technicians",
  ignore: ignoreTest,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    if (!connectionString) {
      return;
    }

    const pool = new Pool(connectionString, 1, true);
    const client = await pool.connect();

    const orgId = crypto.randomUUID();
    const technicianId = crypto.randomUUID();
    const bayId = crypto.randomUUID();
    const existingId = crypto.randomUUID();

    try {
      await client.queryArray`begin`;
      await client.queryArray`insert into organizations (id, name, slug) values (${orgId}, 'Test Org', ${"planner-test-" + orgId.slice(0, 8)})`;
      await client.queryArray`insert into technicians (id, org_id, skills) values (${technicianId}, ${orgId}, array['diagnostics'])`;
      await client.queryArray`insert into bays (id, org_id, name) values (${bayId}, ${orgId}, 'Lift Test')`;
      await client.queryArray`insert into appointments (id, org_id, title, technician_id, bay_id, status, starts_at, ends_at)
        values (${existingId}, ${orgId}, 'Existing', ${technicianId}, ${bayId}, 'scheduled', ${"2024-05-01T08:00:00Z"}, ${"2024-05-01T09:00:00Z"})`;

      const overlapTech = await client.queryObject<{ allowed: boolean }>`
        select can_schedule(${orgId}, ${technicianId}, ${null}, ${"2024-05-01T08:30:00Z"}, ${"2024-05-01T09:30:00Z"}) as allowed
      `;
      if (overlapTech.rows[0]?.allowed !== false) {
        throw new Error("Expected technician overlap to be blocked");
      }

      const overlapBay = await client.queryObject<{ allowed: boolean }>`
        select can_schedule(${orgId}, ${null}, ${bayId}, ${"2024-05-01T08:30:00Z"}, ${"2024-05-01T09:30:00Z"}) as allowed
      `;
      if (overlapBay.rows[0]?.allowed !== false) {
        throw new Error("Expected bay overlap to be blocked");
      }

      const ignoreSelf = await client.queryObject<{ allowed: boolean }>`
        select can_schedule(${orgId}, ${technicianId}, ${bayId}, ${"2024-05-01T08:00:00Z"}, ${"2024-05-01T09:00:00Z"}, ${existingId}) as allowed
      `;
      if (ignoreSelf.rows[0]?.allowed !== true) {
        throw new Error("Existing appointment should be ignored when updating itself");
      }

      const freeSlot = await client.queryObject<{ allowed: boolean }>`
        select can_schedule(${orgId}, ${technicianId}, ${bayId}, ${"2024-05-01T09:00:00Z"}, ${"2024-05-01T10:00:00Z"}) as allowed
      `;
      if (freeSlot.rows[0]?.allowed !== true) {
        throw new Error("Non-conflicting slot should be allowed");
      }
    } finally {
      await client.queryArray`rollback`;
      client.release();
      await pool.end();
    }
  },
});
