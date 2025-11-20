-- Phase 6 workflow & collaboration enhancements

-- Ensure new work order status values exist
DO $$
BEGIN
  ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'WAITING_APPROVAL';
  ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'APPROVED';
  ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'DECLINED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- User notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
  notify_push BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  overdue_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  low_inventory_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  daily_reports BOOLEAN NOT NULL DEFAULT FALSE,
  weekly_reports BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_org
  ON user_notification_preferences (org_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User notification prefs select" ON user_notification_preferences;
DROP POLICY IF EXISTS "User notification prefs upsert" ON user_notification_preferences;
DROP POLICY IF EXISTS "User notification prefs update" ON user_notification_preferences;

CREATE POLICY "User notification prefs select" ON user_notification_preferences
  FOR SELECT
  USING (
    profile_id = auth.uid()
    OR (is_admin() AND org_id = get_user_org_id())
  );

CREATE POLICY "User notification prefs insert" ON user_notification_preferences
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND org_id = get_user_org_id()
  );

CREATE POLICY "User notification prefs update" ON user_notification_preferences
  FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR (is_admin() AND org_id = get_user_org_id())
  )
  WITH CHECK (
    org_id = get_user_org_id()
  );

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Work order notes
CREATE TABLE IF NOT EXISTS work_order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}'::UUID[],
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_notes_work_order
  ON work_order_notes (work_order_id, created_at DESC);

ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work order notes view" ON work_order_notes;
DROP POLICY IF EXISTS "Work order notes manage" ON work_order_notes;

CREATE POLICY "Work order notes view" ON work_order_notes
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Work order notes manage" ON work_order_notes
  FOR ALL
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN','FRONT_DESK')
  )
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN','FRONT_DESK')
  );

CREATE TRIGGER update_work_order_notes_updated_at
  BEFORE UPDATE ON work_order_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Work order activity log
CREATE TABLE IF NOT EXISTS work_order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_activity_work_order
  ON work_order_activity (work_order_id, created_at DESC);

ALTER TABLE work_order_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work order activity view" ON work_order_activity;
DROP POLICY IF EXISTS "Work order activity insert" ON work_order_activity;

CREATE POLICY "Work order activity view" ON work_order_activity
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Work order activity insert" ON work_order_activity
  FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

-- Work order approvals
DO $$
BEGIN
  CREATE TYPE work_order_approval_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'SUPERSEDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS work_order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status work_order_approval_status NOT NULL DEFAULT 'PENDING',
  message TEXT,
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_order_approvals_work_order
  ON work_order_approvals (work_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_order_approvals_status
  ON work_order_approvals (status);

ALTER TABLE work_order_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work order approvals view" ON work_order_approvals;
DROP POLICY IF EXISTS "Work order approvals manage" ON work_order_approvals;

CREATE POLICY "Work order approvals view" ON work_order_approvals
  FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "Work order approvals manage" ON work_order_approvals
  FOR ALL
  USING (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN','FRONT_DESK')
  )
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN','FRONT_DESK')
  );

CREATE TRIGGER update_work_order_approvals_updated_at
  BEFORE UPDATE ON work_order_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Extend internal messages metadata
ALTER TABLE internal_messages
  ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}'::UUID[];

ALTER TABLE internal_messages
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Allow staff to enqueue notifications
CREATE POLICY IF NOT EXISTS "Staff can enqueue notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    org_id = get_user_org_id()
    AND get_user_role() IN ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN','FRONT_DESK')
  );

-- Activity logging helper
CREATE OR REPLACE FUNCTION log_work_order_activity(
  p_work_order_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS work_order_activity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_activity work_order_activity;
BEGIN
  SELECT org_id INTO v_org_id
  FROM work_orders
  WHERE id = p_work_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order % not found', p_work_order_id;
  END IF;

  IF v_org_id <> get_user_org_id() THEN
    RAISE EXCEPTION 'Unauthorized to log activity for this work order';
  END IF;

  INSERT INTO work_order_activity (org_id, work_order_id, actor_id, action, details)
  VALUES (
    v_org_id,
    p_work_order_id,
    (SELECT id FROM profiles WHERE id = auth.uid()),
    p_action,
    COALESCE(p_details, '{}'::JSONB)
  )
  RETURNING * INTO v_activity;

  RETURN v_activity;
END;
$$;

-- Request customer approval helper
CREATE OR REPLACE FUNCTION request_work_order_approval(
  p_work_order_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS work_order_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_customer_id UUID;
  v_record work_order_approvals;
BEGIN
  SELECT org_id, customer_id INTO v_org_id, v_customer_id
  FROM work_orders
  WHERE id = p_work_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order % not found', p_work_order_id;
  END IF;

  IF v_org_id <> get_user_org_id() THEN
    RAISE EXCEPTION 'Unauthorized to request approval for this work order';
  END IF;

  UPDATE work_order_approvals
  SET status = 'SUPERSEDED', updated_at = now()
  WHERE work_order_id = p_work_order_id AND status = 'PENDING';

  UPDATE work_orders
  SET status = 'WAITING_APPROVAL', updated_at = now()
  WHERE id = p_work_order_id;

  INSERT INTO work_order_approvals (
    org_id,
    work_order_id,
    customer_id,
    requested_by,
    status,
    message
  )
  VALUES (
    v_org_id,
    p_work_order_id,
    v_customer_id,
    auth.uid(),
    'PENDING',
    p_message
  )
  RETURNING * INTO v_record;

  PERFORM log_work_order_activity(
    p_work_order_id,
    'approval.requested',
    jsonb_build_object('approval_id', v_record.id, 'message', p_message)
  );

  RETURN v_record;
END;
$$;

-- Update customer portal approval handler to sync approval records
CREATE OR REPLACE FUNCTION customer_portal_update_work_order(
  p_work_order_id UUID,
  p_customer_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_previous_status work_order_status;
  v_status work_order_status;
  v_approval_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM work_orders wo
    WHERE wo.id = p_work_order_id
      AND wo.org_id = p_org_id
      AND wo.customer_id = p_customer_id
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Work order not accessible';
  END IF;

  SELECT status INTO v_previous_status FROM work_orders WHERE id = p_work_order_id;

  v_status := p_status::work_order_status;

  UPDATE work_orders
  SET status = v_status,
      updated_at = now()
  WHERE id = p_work_order_id;

  SELECT id INTO v_approval_id
  FROM work_order_approvals
  WHERE work_order_id = p_work_order_id
    AND status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_approval_id IS NOT NULL THEN
    UPDATE work_order_approvals
    SET status = CASE WHEN v_status = 'APPROVED' THEN 'APPROVED' ELSE 'DECLINED' END,
        response_message = p_comment,
        responded_at = now(),
        updated_at = now()
    WHERE id = v_approval_id;
  END IF;

  PERFORM log_work_order_activity(
    p_work_order_id,
    CASE WHEN v_status = 'APPROVED' THEN 'approval.approved' ELSE 'approval.declined' END,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'new_status', v_status,
      'comment', p_comment
    )
  );

  INSERT INTO customer_messages (
    org_id,
    work_order_id,
    customer_id,
    direction,
    body,
    metadata
  )
  VALUES (
    p_org_id,
    p_work_order_id,
    p_customer_id,
    'customer',
    coalesce(p_comment, '') || CASE WHEN v_status = 'APPROVED' THEN ' ✅ Approved additional work' ELSE ' ❌ Declined additional work' END,
    jsonb_build_object(
      'type', 'approval',
      'previous_status', v_previous_status,
      'new_status', v_status
    )
  );

  RETURN jsonb_build_object(
    'previous_status', v_previous_status,
    'new_status', v_status
  );
END;
$$;
