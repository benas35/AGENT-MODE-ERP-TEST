-- Create demo data step by step
-- First, ensure we have the demo organization
INSERT INTO organizations (id, name, slug, currency, created_by) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Auto Shop', 'demo-auto-shop', 'USD', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Now create workflow stages
INSERT INTO workflow_stages (id, org_id, name, slug, description, color, sort_order, is_default, is_final) VALUES
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Intake', 'intake', 'Initial vehicle check-in', '#3B82F6', 1, true, false),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Diagnosis', 'diagnosis', 'Vehicle inspection and diagnosis', '#F59E0B', 2, false, false),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Waiting Approval', 'waiting-approval', 'Customer approval required', '#EF4444', 3, false, false),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'In Progress', 'in-progress', 'Work being performed', '#8B5CF6', 4, false, false),
('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Quality Check', 'quality-check', 'Final inspection', '#06B6D4', 5, false, false),
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Completed', 'completed', 'Ready for pickup', '#10B981', 6, false, true)
ON CONFLICT (id) DO NOTHING;