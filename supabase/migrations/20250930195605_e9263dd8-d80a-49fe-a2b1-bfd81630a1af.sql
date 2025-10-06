-- Simplified demo data insertion

-- Insert demo customers
INSERT INTO customers (org_id, customer_number, first_name, last_name, email, phone, created_at)
SELECT 
  (SELECT org_id FROM profiles LIMIT 1),
  'CUST-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  first_name,
  last_name,
  email,
  phone,
  NOW()
FROM (VALUES 
  ('John', 'Doe', 'john.doe@example.com', '+1-555-0101'),
  ('Jane', 'Smith', 'jane.smith@example.com', '+1-555-0102'),
  ('Mike', 'Johnson', 'mike.j@example.com', '+1-555-0103')
) AS demo(first_name, last_name, email, phone)
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = demo.email);

-- Insert demo vehicles
INSERT INTO vehicles (org_id, customer_id, vin, year, make, model, license_plate, created_at)
SELECT 
  (SELECT org_id FROM profiles LIMIT 1),
  c.id,
  'VIN' || UPPER(substring(MD5(RANDOM()::text) from 1 for 17)),
  year,
  make,
  model,
  license_plate,
  NOW()
FROM customers c
CROSS JOIN LATERAL (VALUES 
  (2020, 'Toyota', 'Camry', 'ABC123'),
  (2019, 'Honda', 'Civic', 'XYZ789'),
  (2021, 'Ford', 'F-150', 'DEF456')
) AS v(year, make, model, license_plate)
WHERE c.org_id = (SELECT org_id FROM profiles LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM vehicles WHERE customer_id = c.id)
LIMIT 3;

-- Insert demo resources (technicians)
INSERT INTO resources (org_id, name, type, color, active, meta, created_at)
SELECT 
  (SELECT org_id FROM profiles LIMIT 1),
  name,
  'TECHNICIAN',
  color,
  true,
  jsonb_build_object('skills', skills),
  NOW()
FROM (VALUES 
  ('Alex Martinez', '#3B82F6', ARRAY['Engine Repair']),
  ('Sam Rodriguez', '#10B981', ARRAY['Brake Systems']),
  ('Jordan Lee', '#F59E0B', ARRAY['Electrical'])
) AS t(name, color, skills)
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = t.name);

-- Insert demo service templates
INSERT INTO service_templates (org_id, name, category, default_duration_minutes, estimated_hours, color, operations, created_at)
SELECT 
  (SELECT org_id FROM profiles LIMIT 1),
  name,
  category,
  duration,
  duration / 60.0,
  color,
  operations,
  NOW()
FROM (VALUES 
  ('Oil Change', 'Maintenance', 60, '#10B981', '[{"name":"Oil Change","duration":60}]'::jsonb),
  ('Brake Service', 'Brakes', 120, '#EF4444', '[{"name":"Brake Service","duration":120}]'::jsonb),
  ('Inspection', 'Diagnostics', 90, '#3B82F6', '[{"name":"Inspection","duration":90}]'::jsonb)
) AS st(name, category, duration, color, operations)
WHERE NOT EXISTS (SELECT 1 FROM service_templates WHERE name = st.name);

-- Insert demo appointments
INSERT INTO appointments (
  org_id, 
  customer_id, 
  vehicle_id, 
  title, 
  start_time, 
  end_time, 
  status, 
  priority,
  created_by,
  created_at
)
SELECT 
  (SELECT org_id FROM profiles LIMIT 1),
  c.id,
  v.id,
  'Oil Change',
  NOW() + (day_offset || ' days')::interval + '9 hours'::interval,
  NOW() + (day_offset || ' days')::interval + '10 hours'::interval,
  'SCHEDULED',
  'normal',
  (SELECT id FROM profiles LIMIT 1),
  NOW()
FROM (VALUES (0), (1), (2)) AS slots(day_offset)
CROSS JOIN LATERAL (
  SELECT id FROM customers WHERE org_id = (SELECT org_id FROM profiles LIMIT 1) ORDER BY RANDOM() LIMIT 1
) c
CROSS JOIN LATERAL (
  SELECT id FROM vehicles WHERE customer_id = c.id LIMIT 1
) v
WHERE NOT EXISTS (
  SELECT 1 FROM appointments 
  WHERE customer_id = c.id 
  AND start_time::date = (NOW() + (day_offset || ' days')::interval)::date
);

-- Assign resources to appointments  
INSERT INTO appointment_resources (org_id, appointment_id, resource_id)
SELECT 
  a.org_id,
  a.id,
  (SELECT id FROM resources WHERE org_id = a.org_id AND type = 'TECHNICIAN' LIMIT 1)
FROM appointments a
WHERE a.org_id = (SELECT org_id FROM profiles LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM appointment_resources WHERE appointment_id = a.id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(org_id, start_time);
CREATE INDEX IF NOT EXISTS idx_resources_org_type ON resources(org_id, type, active);