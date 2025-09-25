-- Create vehicle_media table for thumbnails and images
CREATE TABLE IF NOT EXISTS vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'hero', -- hero|gallery
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for vehicle_media
ALTER TABLE vehicle_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service staff can manage vehicle media" 
ON vehicle_media FOR ALL 
USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role, 'FRONT_DESK'::app_role]));

CREATE POLICY "Users can view vehicle media in their org" 
ON vehicle_media FOR SELECT 
USING (org_id = get_user_org_id());

-- Create appointment_operations table for detailed service operations
CREATE TABLE IF NOT EXISTS appointment_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_template_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  actual_hours NUMERIC(6,2),
  technician_id UUID,
  work_zone_id UUID,
  dvi_required BOOLEAN DEFAULT false,
  parts_required JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending', -- pending|in_progress|completed|cancelled
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for appointment_operations
ALTER TABLE appointment_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service staff can manage appointment operations" 
ON appointment_operations FOR ALL 
USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role, 'FRONT_DESK'::app_role]));

CREATE POLICY "Users can view appointment operations in their org" 
ON appointment_operations FOR SELECT 
USING (org_id = get_user_org_id());

-- Create service_templates table for predefined service packages
CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- oil_change|brake_service|inspection|diagnostics|custom
  default_duration_minutes INTEGER DEFAULT 60,
  estimated_hours NUMERIC(6,2) DEFAULT 1.0,
  operations JSONB DEFAULT '[]'::jsonb, -- Array of operation details
  parts JSONB DEFAULT '[]'::jsonb, -- Array of required parts
  skills_required JSONB DEFAULT '[]'::jsonb, -- Required technician skills
  color TEXT DEFAULT '#10B981',
  active BOOLEAN DEFAULT true,
  created_by UUID, -- Make nullable for system templates
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for service_templates
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service advisors can manage service templates" 
ON service_templates FOR ALL 
USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role]));

CREATE POLICY "Users can view service templates in their org" 
ON service_templates FOR SELECT 
USING (org_id = get_user_org_id());

-- Add updated_at triggers
CREATE TRIGGER update_vehicle_media_updated_at
    BEFORE UPDATE ON vehicle_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_operations_updated_at
    BEFORE UPDATE ON appointment_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_templates_updated_at
    BEFORE UPDATE ON service_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle_id ON vehicle_media(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_media_kind ON vehicle_media(kind);
CREATE INDEX IF NOT EXISTS idx_appointment_operations_appointment_id ON appointment_operations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_operations_technician_id ON appointment_operations(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_templates_category ON service_templates(category, active);

-- Insert default service templates (only if organization exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    INSERT INTO service_templates (org_id, name, category, default_duration_minutes, estimated_hours, operations, color) 
    SELECT 
      (SELECT id FROM organizations LIMIT 1),
      'Oil Change Service',
      'oil_change',
      30,
      0.5,
      '[{"name": "Oil drain", "duration": 10}, {"name": "Filter replacement", "duration": 10}, {"name": "Oil refill", "duration": 10}]'::jsonb,
      '#10B981'
    ON CONFLICT DO NOTHING;

    INSERT INTO service_templates (org_id, name, category, default_duration_minutes, estimated_hours, operations, color) 
    SELECT 
      (SELECT id FROM organizations LIMIT 1),
      'Brake Service',
      'brake_service',
      90,
      1.5,
      '[{"name": "Brake inspection", "duration": 20}, {"name": "Pad replacement", "duration": 40}, {"name": "Brake test", "duration": 30}]'::jsonb,
      '#F59E0B'
    ON CONFLICT DO NOTHING;

    INSERT INTO service_templates (org_id, name, category, default_duration_minutes, estimated_hours, operations, color) 
    SELECT 
      (SELECT id FROM organizations LIMIT 1),
      'Vehicle Inspection',
      'inspection',
      60,
      1.0,
      '[{"name": "Visual inspection", "duration": 30}, {"name": "Systems check", "duration": 20}, {"name": "Report generation", "duration": 10}]'::jsonb,
      '#3B82F6'
    ON CONFLICT DO NOTHING;

    INSERT INTO service_templates (org_id, name, category, default_duration_minutes, estimated_hours, operations, color) 
    SELECT 
      (SELECT id FROM organizations LIMIT 1),
      'Diagnostic Service',
      'diagnostics',
      120,
      2.0,
      '[{"name": "System scan", "duration": 30}, {"name": "Issue analysis", "duration": 60}, {"name": "Report & recommendations", "duration": 30}]'::jsonb,
      '#EF4444'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;