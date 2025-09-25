-- Create workflow stages table
CREATE TABLE public.workflow_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  sla_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Create workflow transitions table
CREATE TABLE public.workflow_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  from_stage_id UUID REFERENCES public.workflow_stages(id),
  to_stage_id UUID NOT NULL REFERENCES public.workflow_stages(id),
  name TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  auto_transition BOOLEAN DEFAULT false,
  required_role app_role,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, from_stage_id, to_stage_id)
);

-- Add workflow fields to work_orders table
ALTER TABLE public.work_orders ADD COLUMN workflow_stage_id UUID REFERENCES public.workflow_stages(id);
ALTER TABLE public.work_orders ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.work_orders ADD COLUMN sla_due_at TIMESTAMPTZ;
ALTER TABLE public.work_orders ADD COLUMN workflow_notes TEXT;

-- Enable RLS on new tables
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

-- Create policies for workflow_stages
CREATE POLICY "Admins can manage workflow stages" 
ON public.workflow_stages 
FOR ALL 
USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can view workflow stages in their org" 
ON public.workflow_stages 
FOR SELECT 
USING (org_id = get_user_org_id());

-- Create policies for workflow_transitions
CREATE POLICY "Admins can manage workflow transitions" 
ON public.workflow_transitions 
FOR ALL 
USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can view workflow transitions in their org" 
ON public.workflow_transitions 
FOR SELECT 
USING (org_id = get_user_org_id());

-- Create function to move work order between stages
CREATE OR REPLACE FUNCTION public.move_work_order_stage(
  p_work_order_id UUID,
  p_to_stage_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id_val UUID := get_user_org_id();
  current_stage_id UUID;
  sla_hours INTEGER;
BEGIN
  -- Check if work order exists and user has access
  SELECT workflow_stage_id INTO current_stage_id
  FROM work_orders 
  WHERE id = p_work_order_id AND org_id = org_id_val;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found or access denied';
  END IF;

  -- Get SLA hours for new stage
  SELECT ws.sla_hours INTO sla_hours
  FROM workflow_stages ws
  WHERE ws.id = p_to_stage_id AND ws.org_id = org_id_val;

  -- Update work order stage
  UPDATE work_orders
  SET workflow_stage_id = p_to_stage_id,
      stage_entered_at = now(),
      sla_due_at = CASE WHEN sla_hours IS NOT NULL THEN now() + (sla_hours || ' hours')::INTERVAL ELSE NULL END,
      workflow_notes = COALESCE(workflow_notes || E'\n' || p_notes, p_notes),
      updated_at = now()
  WHERE id = p_work_order_id AND org_id = org_id_val;

  -- Log the stage change
  INSERT INTO audit_log (org_id, entity_type, entity_id, action, user_id, new_values)
  VALUES (
    org_id_val,
    'work_order',
    p_work_order_id,
    'stage_change',
    auth.uid(),
    jsonb_build_object(
      'from_stage_id', current_stage_id,
      'to_stage_id', p_to_stage_id,
      'notes', p_notes
    )
  );

  RETURN true;
END;
$$;

-- Create function to get workflow metrics
CREATE OR REPLACE FUNCTION public.get_workflow_metrics(
  p_location_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  stage_id UUID,
  stage_name TEXT,
  stage_color TEXT,
  work_order_count BIGINT,
  avg_cycle_time_hours NUMERIC,
  overdue_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id_val UUID := get_user_org_id();
BEGIN
  RETURN QUERY
  SELECT 
    ws.id,
    ws.name,
    ws.color,
    COUNT(wo.id) as work_order_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(wo.completed_at, now()) - wo.stage_entered_at)) / 3600), 2) as avg_cycle_time_hours,
    COUNT(wo.id) FILTER (WHERE wo.sla_due_at IS NOT NULL AND wo.sla_due_at < now() AND wo.completed_at IS NULL) as overdue_count
  FROM workflow_stages ws
  LEFT JOIN work_orders wo ON wo.workflow_stage_id = ws.id 
    AND wo.org_id = org_id_val
    AND (p_location_id IS NULL OR wo.location_id = p_location_id)
    AND wo.created_at::DATE BETWEEN p_date_from AND p_date_to
  WHERE ws.org_id = org_id_val
  GROUP BY ws.id, ws.name, ws.color, ws.sort_order
  ORDER BY ws.sort_order;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_workflow_stages_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workflow stages
INSERT INTO public.workflow_stages (org_id, name, slug, description, color, sort_order, is_default, is_final, sla_hours) VALUES
-- Note: org_id will need to be set by the application for each organization
(gen_random_uuid(), 'Intake', 'intake', 'Initial work order creation and customer check-in', '#8B5CF6', 0, true, false, 1),
(gen_random_uuid(), 'Diagnosis', 'diagnosis', 'Problem identification and estimate creation', '#F59E0B', 1, false, false, 4),
(gen_random_uuid(), 'Parts Ordering', 'parts-ordering', 'Waiting for parts to arrive', '#EF4444', 2, false, false, 24),
(gen_random_uuid(), 'In Progress', 'in-progress', 'Active repair work being performed', '#3B82F6', 3, false, false, 8),
(gen_random_uuid(), 'Quality Check', 'quality-check', 'Final inspection and testing', '#10B981', 4, false, false, 2),
(gen_random_uuid(), 'Ready for Pickup', 'ready-pickup', 'Work completed, awaiting customer', '#06B6D4', 5, false, false, 48),
(gen_random_uuid(), 'Completed', 'completed', 'Service completed and customer notified', '#22C55E', 6, false, true, null);