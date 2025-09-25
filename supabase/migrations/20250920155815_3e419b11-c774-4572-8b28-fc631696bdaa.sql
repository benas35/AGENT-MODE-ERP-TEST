-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enhanced enums
CREATE TYPE branch_type AS ENUM ('MAIN', 'SATELLITE', 'MOBILE');
CREATE TYPE organization_status AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');
CREATE TYPE access_level AS ENUM ('BRANCH', 'ORGANIZATION', 'CROSS_ORGANIZATION');

-- Organizations table (enhanced)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status organization_status DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Enhanced locations/branches table  
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS branch_type branch_type DEFAULT 'MAIN',
ADD COLUMN IF NOT EXISTS manager_id UUID,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS fiscal_year_start DATE DEFAULT '2024-01-01';

-- Access rights for cross-branch permissions
CREATE TABLE IF NOT EXISTS access_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    access_level access_level NOT NULL DEFAULT 'BRANCH',
    permissions JSONB DEFAULT '{}'::jsonb,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, branch_id, access_level)
);

-- Enhanced workflow stages with branch-specific settings
ALTER TABLE workflow_stages
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES locations(id),
ADD COLUMN IF NOT EXISTS auto_assign_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_rules JSONB DEFAULT '{}'::jsonb;

-- Work zones for planner
CREATE TABLE IF NOT EXISTS work_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 1,
    color TEXT DEFAULT '#3B82F6',
    equipment JSONB DEFAULT '[]'::jsonb,
    skills_required JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(org_id, branch_id, code)
);

-- Enhanced resources with zones and skills
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS work_zone_id UUID REFERENCES work_zones(id),
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'FULL_TIME',
ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Planner templates
CREATE TABLE IF NOT EXISTS planner_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    service_type TEXT,
    default_duration_minutes INTEGER DEFAULT 60,
    required_skills JSONB DEFAULT '[]'::jsonb,
    work_zone_id UUID REFERENCES work_zones(id),
    template_data JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced appointments for planner
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS work_zone_id UUID REFERENCES work_zones(id),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES planner_templates(id),
ADD COLUMN IF NOT EXISTS planned_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS planned_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delay_reason TEXT,
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS parts_ready BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_approved BOOLEAN DEFAULT false;

-- Digital Vehicle Inspections
CREATE TABLE IF NOT EXISTS dvi_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vehicle_type TEXT,
    service_type TEXT,
    checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dvis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    template_id UUID REFERENCES dvi_templates(id),
    technician_id UUID,
    status TEXT DEFAULT 'IN_PROGRESS',
    inspection_data JSONB DEFAULT '{}'::jsonb,
    customer_viewed_at TIMESTAMP WITH TIME ZONE,
    customer_approved_at TIMESTAMP WITH TIME ZONE,
    customer_signature JSONB,
    share_token TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Communication center
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    work_order_id UUID REFERENCES work_orders(id),
    type TEXT NOT NULL, -- 'SMS', 'EMAIL', 'CALL', 'NOTE'
    direction TEXT NOT NULL, -- 'INBOUND', 'OUTBOUND'
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'SENT',
    provider_id TEXT,
    provider_response JSONB,
    attachments JSONB DEFAULT '[]'::jsonb,
    sent_by UUID,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Labor providers integration
CREATE TABLE IF NOT EXISTS labor_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL, -- 'MOTOR', 'HAYNES', 'ALLDATA'
    api_endpoint TEXT,
    credentials JSONB,
    settings JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    seats_available INTEGER DEFAULT 1,
    seats_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor_lookups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES labor_providers(id),
    vin TEXT,
    year INTEGER,
    make TEXT,
    model TEXT,
    engine TEXT,
    operation_code TEXT,
    operation_name TEXT,
    labor_hours NUMERIC(4,2),
    diagrams JSONB DEFAULT '[]'::jsonb,
    procedures JSONB DEFAULT '[]'::jsonb,
    cached_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced inventory with multi-warehouse
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS warehouse_id UUID,
ADD COLUMN IF NOT EXISTS shelf_location TEXT,
ADD COLUMN IF NOT EXISTS bin_location TEXT,
ADD COLUMN IF NOT EXISTS serial_tracked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_lead_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cross_reference JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS markup_rules JSONB DEFAULT '{}'::jsonb;

-- Stock serials tracking
CREATE TABLE IF NOT EXISTS stock_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'ALLOCATED', 'SOLD', 'RETURNED'
    work_order_id UUID REFERENCES work_orders(id),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    allocated_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    warranty_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(org_id, inventory_item_id, serial_number)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address JSONB,
    manager_id UUID,
    settings JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(org_id, code)
);

-- Update inventory_items to reference warehouses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'inventory_items_warehouse_id_fkey') THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT inventory_items_warehouse_id_fkey 
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
    END IF;
END $$;

-- Enhanced suppliers
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS supplier_code TEXT,
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS api_integration JSONB DEFAULT '{}'::jsonb;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_access_rights_user_branch ON access_rights(user_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_planned_start ON appointments(planned_start);
CREATE INDEX IF NOT EXISTS idx_appointments_work_zone ON appointments(work_zone_id);
CREATE INDEX IF NOT EXISTS idx_dvis_work_order ON dvis(work_order_id);
CREATE INDEX IF NOT EXISTS idx_communications_customer ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_labor_lookups_vin ON labor_lookups(vin);
CREATE INDEX IF NOT EXISTS idx_stock_serials_item ON stock_serials(inventory_item_id);

-- Enable RLS on new tables
ALTER TABLE access_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dvi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dvis ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS policies
CREATE POLICY "Users can view their access rights" ON access_rights
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage access rights in their org" ON access_rights
    FOR ALL USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can view work zones in their org" ON work_zones
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage work zones" ON work_zones
    FOR ALL USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Service staff can view planner templates" ON planner_templates
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage planner templates" ON planner_templates
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role]));

CREATE POLICY "Users can view DVI templates in their org" ON dvi_templates
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage DVI templates" ON dvi_templates
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role]));

CREATE POLICY "Service staff can manage DVIs" ON dvis
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role]));

CREATE POLICY "Users can view communications in their org" ON communications
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage communications" ON communications
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role]));

CREATE POLICY "Admins can manage labor providers" ON labor_providers
    FOR ALL USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can view labor providers in their org" ON labor_providers
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can view labor lookups in their org" ON labor_lookups
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage labor lookups" ON labor_lookups
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role]));

CREATE POLICY "Users can view stock serials in their org" ON stock_serials
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts staff can manage stock serials" ON stock_serials
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role]));

CREATE POLICY "Users can view warehouses in their org" ON warehouses
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage warehouses" ON warehouses
    FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- Enhanced database functions
CREATE OR REPLACE FUNCTION get_user_branch_access(target_branch_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM access_rights ar
    WHERE ar.user_id = auth.uid()
      AND ar.org_id = get_user_org_id()
      AND (ar.branch_id = target_branch_id OR ar.access_level = 'ORGANIZATION')
      AND ar.active = true
      AND (ar.expires_at IS NULL OR ar.expires_at > now())
  ) OR is_admin();
$$;

CREATE OR REPLACE FUNCTION calculate_appointment_workload(
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_resource_id UUID DEFAULT NULL,
  p_work_zone_id UUID DEFAULT NULL
)
RETURNS TABLE(
  resource_id UUID,
  work_zone_id UUID,
  planned_hours NUMERIC,
  actual_hours NUMERIC,
  utilization_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.resource_id,
    a.work_zone_id,
    SUM(EXTRACT(EPOCH FROM (a.planned_end - a.planned_start)) / 3600) as planned_hours,
    SUM(EXTRACT(EPOCH FROM (COALESCE(a.actual_end, now()) - COALESCE(a.actual_start, a.planned_start))) / 3600) as actual_hours,
    CASE 
      WHEN SUM(EXTRACT(EPOCH FROM (a.planned_end - a.planned_start)) / 3600) > 0 
      THEN (SUM(EXTRACT(EPOCH FROM (COALESCE(a.actual_end, now()) - COALESCE(a.actual_start, a.planned_start))) / 3600) * 100.0) / 
           SUM(EXTRACT(EPOCH FROM (a.planned_end - a.planned_start)) / 3600)
      ELSE 0 
    END as utilization_pct
  FROM appointments a
  JOIN appointment_resources ar ON a.id = ar.appointment_id
  WHERE a.org_id = get_user_org_id()
    AND a.planned_start >= p_start_time
    AND a.planned_end <= p_end_time
    AND (p_resource_id IS NULL OR ar.resource_id = p_resource_id)
    AND (p_work_zone_id IS NULL OR a.work_zone_id = p_work_zone_id)
    AND a.status NOT IN ('cancelled', 'no_show')
  GROUP BY ar.resource_id, a.work_zone_id;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_work_zones_updated_at BEFORE UPDATE ON work_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planner_templates_updated_at BEFORE UPDATE ON planner_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dvis_updated_at BEFORE UPDATE ON dvis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();