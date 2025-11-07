-- PHASE 1: critical foreign keys and RLS hardening for multi-tenant safety
-- Assumptions adjusted:
-- * work_orders.service_advisor column currently stores profile references; if service_advisor_id exists it is used instead.
-- * inventory table may be named inventory or inventory_items; policies are created for whichever exists.
-- * All referenced tables live in the public schema.

-- === Foreign key repairs on work_orders ===
DO $$
BEGIN
  IF to_regclass('public.work_orders') IS NULL THEN
    RAISE NOTICE 'work_orders table missing, skipping FK remediation';
    RETURN;
  END IF;

  -- technician_id column nullable with FK to resources
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'work_orders'
      AND column_name = 'technician_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.work_orders ADD COLUMN technician_id uuid';
  END IF;

  EXECUTE 'ALTER TABLE public.work_orders ALTER COLUMN technician_id DROP NOT NULL';

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_technician_id_fkey') THEN
    EXECUTE 'ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_technician_id_fkey';
  END IF;

  IF to_regclass('public.resources') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_technician_id_fkey
      FOREIGN KEY (technician_id) REFERENCES public.resources(id) ON DELETE SET NULL';
  ELSE
    RAISE NOTICE 'resources table missing; technician_id FK not created';
  END IF;

  -- service advisor FK: prefer service_advisor_id else service_advisor
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'service_advisor_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.work_orders ALTER COLUMN service_advisor_id DROP NOT NULL';
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_service_advisor_id_fkey') THEN
      EXECUTE 'ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_service_advisor_id_fkey';
    END IF;
    EXECUTE 'ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_service_advisor_id_fkey
      FOREIGN KEY (service_advisor_id) REFERENCES public.profiles(id) ON DELETE SET NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'service_advisor'
  ) THEN
    EXECUTE 'ALTER TABLE public.work_orders ALTER COLUMN service_advisor DROP NOT NULL';
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_service_advisor_fkey') THEN
      EXECUTE 'ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_service_advisor_fkey';
    END IF;
    EXECUTE 'ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_service_advisor_fkey
      FOREIGN KEY (service_advisor) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  -- workflow stage FK
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'workflow_stage_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'work_orders_workflow_stage_id_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.work_orders
        ADD CONSTRAINT work_orders_workflow_stage_id_fkey
        FOREIGN KEY (workflow_stage_id) REFERENCES public.workflow_stages(id) ON DELETE RESTRICT';
    END IF;
  END IF;

  -- customer FK
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_customer_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT';
  END IF;

  -- vehicle FK
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_vehicle_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.work_orders
      ADD CONSTRAINT work_orders_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT';
  END IF;
END$$;

-- Indexes for work_orders foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='work_orders' AND column_name='technician_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON public.work_orders(technician_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='work_orders' AND column_name='customer_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='work_orders' AND column_name='vehicle_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders(vehicle_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='work_orders' AND column_name='workflow_stage_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_work_orders_workflow_stage_id ON public.work_orders(workflow_stage_id)';
  END IF;
END$$;

-- Appointments resource foreign key & indexes
DO $$
BEGIN
  IF to_regclass('public.appointments') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='appointments' AND column_name='resource_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='appointments_resource_id_fkey') THEN
      EXECUTE 'ALTER TABLE public.appointments DROP CONSTRAINT appointments_resource_id_fkey';
    END IF;
    IF to_regclass('public.resources') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.appointments
        ADD CONSTRAINT appointments_resource_id_fkey
        FOREIGN KEY (resource_id) REFERENCES public.resources(id)';
    ELSE
      RAISE NOTICE 'resources table missing; appointments.resource_id FK skipped';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='resource_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_appointments_resource_id ON public.appointments(resource_id)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='starts_at'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name='ends_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_appointments_time ON public.appointments(starts_at, ends_at)';
  END IF;
END$$;

-- === Row Level Security hardening ===

-- Helper to enable org-based policies on tables with org_id columns
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'org_id'
      AND table_name IN (
        'work_orders','work_order_items','work_order_media','vehicle_media','appointments',
        'customers','vehicles','parts','inventory','inventory_items','suppliers','invoices','estimates'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = rec.table_name
        AND policyname = rec.table_name || '_select_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))',
        rec.table_name || '_select_org', rec.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = rec.table_name
        AND policyname = rec.table_name || '_insert_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))',
        rec.table_name || '_insert_org', rec.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = rec.table_name
        AND policyname = rec.table_name || '_update_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))',
        rec.table_name || '_update_org', rec.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = rec.table_name
        AND policyname = rec.table_name || '_delete_org'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))',
        rec.table_name || '_delete_org', rec.table_name
      );
    END IF;
  END LOOP;
END$$;

-- Policies for tables that inherit org via parent references
DO $$
BEGIN
  IF to_regclass('public.work_order_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''woi_select_org'' AND tablename = ''work_order_items'') THEN
      EXECUTE $$CREATE POLICY woi_select_org ON public.work_order_items
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_items.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''woi_insert_org'' AND tablename = ''work_order_items'') THEN
      EXECUTE $$CREATE POLICY woi_insert_org ON public.work_order_items
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_items.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''woi_update_org'' AND tablename = ''work_order_items'') THEN
      EXECUTE $$CREATE POLICY woi_update_org ON public.work_order_items
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_items.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_items.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''woi_delete_org'' AND tablename = ''work_order_items'') THEN
      EXECUTE $$CREATE POLICY woi_delete_org ON public.work_order_items
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_items.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;
  END IF;

  IF to_regclass('public.work_order_media') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.work_order_media ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''wom_select_org'' AND tablename = ''work_order_media'') THEN
      EXECUTE $$CREATE POLICY wom_select_org ON public.work_order_media
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_media.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''wom_insert_org'' AND tablename = ''work_order_media'') THEN
      EXECUTE $$CREATE POLICY wom_insert_org ON public.work_order_media
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_media.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''wom_update_org'' AND tablename = ''work_order_media'') THEN
      EXECUTE $$CREATE POLICY wom_update_org ON public.work_order_media
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_media.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_media.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''wom_delete_org'' AND tablename = ''work_order_media'') THEN
      EXECUTE $$CREATE POLICY wom_delete_org ON public.work_order_media
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.work_orders wo
            WHERE wo.id = work_order_media.work_order_id
              AND wo.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;
  END IF;

  IF to_regclass('public.vehicle_media') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''vm_select_org'' AND tablename = ''vehicle_media'') THEN
      EXECUTE $$CREATE POLICY vm_select_org ON public.vehicle_media
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_media.vehicle_id
              AND v.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''vm_insert_org'' AND tablename = ''vehicle_media'') THEN
      EXECUTE $$CREATE POLICY vm_insert_org ON public.vehicle_media
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_media.vehicle_id
              AND v.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''vm_update_org'' AND tablename = ''vehicle_media'') THEN
      EXECUTE $$CREATE POLICY vm_update_org ON public.vehicle_media
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_media.vehicle_id
              AND v.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_media.vehicle_id
              AND v.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = ''vm_delete_org'' AND tablename = ''vehicle_media'') THEN
      EXECUTE $$CREATE POLICY vm_delete_org ON public.vehicle_media
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.vehicles v
            WHERE v.id = vehicle_media.vehicle_id
              AND v.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
          )
        )$$;
    END IF;
  END IF;
END$$;

-- === Verification helpers ===
-- VERIFY: ensure constraints exist
--   SELECT conname FROM pg_constraint WHERE conname LIKE 'work_orders_%_id_fkey';
-- VERIFY: attempt sample insert (replace UUIDs with real ones)
--   INSERT INTO work_orders (id, org_id, customer_id, vehicle_id, workflow_stage_id, technician_id)
--   VALUES (gen_random_uuid(), 'ORG_UUID', 'CUSTOMER_UUID', 'VEHICLE_UUID', 'STAGE_UUID', NULL)
--   ON CONFLICT DO NOTHING;
--   -- expect failure if technician_id references unknown resource.
-- VERIFY: RLS isolation check (requires appropriate role simulation)
--   -- In Supabase SQL editor run as authenticated user:
--   SELECT * FROM work_orders WHERE org_id <> (SELECT org_id FROM profiles WHERE id = auth.uid()); -- should return 0 rows.

-- DX instructions:
--   -- Apply migration & regenerate types after linking project
--   -- npx supabase db reset --linked
--   -- npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > app/src/types/supabase.ts
