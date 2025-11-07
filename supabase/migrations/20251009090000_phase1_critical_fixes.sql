-- Phase 1: Critical database fixes for Oldauta ERP
-- Ensure work order relationships and row level security are production ready.

-- Drop the legacy technician foreign key that pointed at auth.users and replace it
-- with the proper reference to resources(id).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'work_orders'
      AND c.conname = 'work_orders_technician_id_fkey'
  ) THEN
    ALTER TABLE public.work_orders
      DROP CONSTRAINT work_orders_technician_id_fkey;
  END IF;
END $$;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_technician_id_fkey
  FOREIGN KEY (technician_id)
  REFERENCES public.resources(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id
  ON public.work_orders(technician_id);

-- Ensure service advisors reference profiles(user_id) instead of auth.users(id).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'work_orders'
      AND c.conname = 'work_orders_service_advisor_fkey'
  ) THEN
    ALTER TABLE public.work_orders
      DROP CONSTRAINT work_orders_service_advisor_fkey;
  END IF;
END $$;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_service_advisor_fkey
  FOREIGN KEY (service_advisor)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_service_advisor
  ON public.work_orders(service_advisor);

-- Harden the workflow stage relationship and apply ON DELETE SET NULL for graceful handling
-- when stages are removed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'work_orders'
      AND c.conname = 'work_orders_workflow_stage_id_fkey'
  ) THEN
    ALTER TABLE public.work_orders
      DROP CONSTRAINT work_orders_workflow_stage_id_fkey;
  END IF;
END $$;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_workflow_stage_id_fkey
  FOREIGN KEY (workflow_stage_id)
  REFERENCES public.workflow_stages(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_workflow_stage_id
  ON public.work_orders(workflow_stage_id);

-- Refresh row level security policies for work order media so they enforce org-based access
-- across all read/write operations, including updates.
ALTER TABLE public.work_order_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view work order media in their org" ON public.work_order_media;
CREATE POLICY "Users can view work order media in their org"
  ON public.work_order_media
  FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Service staff can insert work order media" ON public.work_order_media;
CREATE POLICY "Service staff can insert work order media"
  ON public.work_order_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
  );

DROP POLICY IF EXISTS "Service staff can update work order media" ON public.work_order_media;
CREATE POLICY "Service staff can update work order media"
  ON public.work_order_media
  FOR UPDATE
  TO authenticated
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
  )
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
  );

DROP POLICY IF EXISTS "Service staff can delete work order media" ON public.work_order_media;
CREATE POLICY "Service staff can delete work order media"
  ON public.work_order_media
  FOR DELETE
  TO authenticated
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
  );

-- Ensure vehicle media policies remain enforced with the expected org-based guard.
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vehicle media in their org" ON public.vehicle_media;
CREATE POLICY "Users can view vehicle media in their org"
  ON public.vehicle_media
  FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id());

DROP POLICY IF EXISTS "Service staff can manage vehicle media" ON public.vehicle_media;
CREATE POLICY "Service staff can manage vehicle media"
  ON public.vehicle_media
  FOR ALL
  TO authenticated
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'FRONT_DESK')
  )
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'FRONT_DESK')
  );

-- Confirm key operational tables enforce row level security.
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Add helper indexes that improve join performance when filtering by organisation on the
-- updated relationships.
CREATE INDEX IF NOT EXISTS idx_work_orders_service_advisor_org
  ON public.work_orders(org_id, service_advisor)
  WHERE service_advisor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_technician_org
  ON public.work_orders(org_id, technician_id)
  WHERE technician_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_stage_org
  ON public.work_orders(org_id, workflow_stage_id)
  WHERE workflow_stage_id IS NOT NULL;
