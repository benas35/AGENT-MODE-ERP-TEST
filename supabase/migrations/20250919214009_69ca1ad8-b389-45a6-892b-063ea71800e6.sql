-- Seed data for planner system

-- Insert scheduler settings for the main organization
INSERT INTO public.scheduler_settings (org_id, location_id, day_start, day_end, slot_minutes, allow_double_booking, default_view, timezone, reminder_lead_minutes, booking_window_days)
SELECT 
  o.id, 
  l.id,
  '07:00'::TIME,
  '19:00'::TIME,
  15,
  false,
  'week',
  'Europe/Vilnius',
  ARRAY[1440, 120, 30], -- 24 hours, 2 hours, 30 minutes
  90
FROM organizations o
CROSS JOIN locations l
WHERE o.name = 'AutoCare Pro' AND l.name = 'Main Location'
ON CONFLICT (org_id, location_id) DO NOTHING;

-- Insert appointment types
INSERT INTO public.appointment_types (org_id, name, default_duration_minutes, color, requires_vehicle, requires_customer, default_services)
SELECT 
  o.id,
  type_data.name,
  type_data.duration,
  type_data.color,
  type_data.requires_vehicle,
  type_data.requires_customer,
  type_data.services
FROM organizations o,
(VALUES 
  ('Oil Change', 30, '#10B981', true, true, '[{"description": "Engine oil change", "estimated_minutes": 30}]'::jsonb),
  ('Brake Service', 90, '#F59E0B', true, true, '[{"description": "Brake inspection and service", "estimated_minutes": 90}]'::jsonb),
  ('Tire Service', 45, '#8B5CF6', true, true, '[{"description": "Tire rotation or replacement", "estimated_minutes": 45}]'::jsonb),
  ('General Inspection', 60, '#3B82F6', true, true, '[{"description": "Vehicle safety inspection", "estimated_minutes": 60}]'::jsonb),
  ('Engine Diagnostics', 120, '#EF4444', true, true, '[{"description": "Computer diagnostics", "estimated_minutes": 120}]'::jsonb),
  ('Transmission Service', 180, '#F97316', true, true, '[{"description": "Transmission fluid and filter", "estimated_minutes": 180}]'::jsonb),
  ('AC Service', 75, '#06B6D4', true, true, '[{"description": "Air conditioning service", "estimated_minutes": 75}]'::jsonb),
  ('Consultation', 30, '#84CC16', false, true, '[{"description": "Customer consultation", "estimated_minutes": 30}]'::jsonb),
  ('Walk-in', 15, '#6B7280', false, false, '[{"description": "Walk-in service", "estimated_minutes": 15}]'::jsonb),
  ('Emergency', 60, '#DC2626', true, true, '[{"description": "Emergency repair", "estimated_minutes": 60}]'::jsonb)
) AS type_data(name, duration, color, requires_vehicle, requires_customer, services)
WHERE o.name = 'AutoCare Pro'
ON CONFLICT DO NOTHING;

-- Insert technician resources
INSERT INTO public.resources (org_id, location_id, type, name, color, capacity, active, meta)
SELECT 
  o.id,
  l.id,
  'TECHNICIAN',
  tech_data.name,
  tech_data.color,
  1,
  true,
  jsonb_build_object('specialties', tech_data.specialties, 'hourly_rate', tech_data.rate)
FROM organizations o
CROSS JOIN locations l,
(VALUES 
  ('Mike Johnson', '#FF6B6B', ARRAY['engine', 'diagnostics'], 45.00),
  ('Sarah Wilson', '#4ECDC4', ARRAY['brakes', 'suspension'], 42.00),
  ('David Chen', '#45B7D1', ARRAY['transmission', 'drivetrain'], 48.00),
  ('Lisa Garcia', '#96CEB4', ARRAY['electrical', 'ac'], 46.00),
  ('Tom Anderson', '#FFEAA7', ARRAY['tires', 'alignment'], 40.00),
  ('Emma Thompson', '#DDA0DD', ARRAY['general', 'inspection'], 38.00)
) AS tech_data(name, color, specialties, rate)
WHERE o.name = 'AutoCare Pro' AND l.name = 'Main Location'
ON CONFLICT DO NOTHING;

-- Insert bay resources
INSERT INTO public.resources (org_id, location_id, type, name, color, capacity, active, meta)
SELECT 
  o.id,
  l.id,
  'BAY',
  bay_data.name,
  bay_data.color,
  1,
  true,
  jsonb_build_object('lift_type', bay_data.lift_type, 'max_weight', bay_data.max_weight)
FROM organizations o
CROSS JOIN locations l,
(VALUES 
  ('Bay 1 - Quick Service', '#E74C3C', 'two_post', 9000),
  ('Bay 2 - Heavy Duty', '#3498DB', 'four_post', 12000),
  ('Bay 3 - Alignment', '#2ECC71', 'scissor', 6000),
  ('Bay 4 - General Service', '#F39C12', 'two_post', 9000)
) AS bay_data(name, color, lift_type, max_weight)
WHERE o.name = 'AutoCare Pro' AND l.name = 'Main Location'
ON CONFLICT DO NOTHING;

-- Insert courtesy car resources
INSERT INTO public.resources (org_id, location_id, type, name, color, capacity, active, meta)
SELECT 
  o.id,
  l.id,
  'COURTESY_CAR',
  car_data.name,
  car_data.color,
  1,
  true,
  jsonb_build_object('make', car_data.make, 'model', car_data.model, 'year', car_data.year, 'license_plate', car_data.plate)
FROM organizations o
CROSS JOIN locations l,
(VALUES 
  ('Courtesy Car 1', '#17A2B8', 'Toyota', 'Corolla', 2022, 'CC-001'),
  ('Courtesy Car 2', '#28A745', 'Honda', 'Civic', 2021, 'CC-002')
) AS car_data(name, color, make, model, year, plate)
WHERE o.name = 'AutoCare Pro' AND l.name = 'Main Location'
ON CONFLICT DO NOTHING;

-- Insert resource availability (Monday to Friday, 7 AM to 7 PM)
INSERT INTO public.resource_availability (org_id, resource_id, weekday, start_time, end_time)
SELECT 
  r.org_id,
  r.id,
  wd.weekday,
  '07:00'::TIME,
  CASE 
    WHEN wd.weekday = 6 THEN '15:00'::TIME  -- Saturday until 3 PM
    WHEN wd.weekday = 0 THEN '12:00'::TIME  -- Sunday until noon
    ELSE '19:00'::TIME  -- Monday-Friday until 7 PM
  END
FROM public.resources r
CROSS JOIN (
  SELECT generate_series(1, 6) AS weekday  -- Monday to Saturday
  UNION SELECT 0  -- Sunday
) wd
WHERE r.type IN ('TECHNICIAN', 'BAY')
ON CONFLICT DO NOTHING;

-- Insert some resource time off examples
INSERT INTO public.resource_time_off (org_id, resource_id, start_time, end_time, reason)
SELECT 
  r.org_id,
  r.id,
  (CURRENT_DATE + INTERVAL '7 days' + TIME '09:00')::TIMESTAMPTZ,
  (CURRENT_DATE + INTERVAL '7 days' + TIME '17:00')::TIMESTAMPTZ,
  'Training Day'
FROM public.resources r
WHERE r.name = 'Mike Johnson' AND r.type = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO public.resource_time_off (org_id, resource_id, start_time, end_time, reason)
SELECT 
  r.org_id,
  r.id,
  (CURRENT_DATE + INTERVAL '10 days' + TIME '13:00')::TIMESTAMPTZ,
  (CURRENT_DATE + INTERVAL '10 days' + TIME '17:00')::TIMESTAMPTZ,
  'Equipment Maintenance'
FROM public.resources r
WHERE r.name = 'Bay 2 - Heavy Duty' AND r.type = 'BAY'
ON CONFLICT DO NOTHING;

-- Sample appointments with different statuses and times
INSERT INTO public.appointments (
  org_id, location_id, customer_id, vehicle_id, type_id,
  title, description, start_time, end_time, status, priority,
  source, estimated_minutes, created_by
)
SELECT 
  o.id,
  l.id,
  c.id,
  v.id,
  at.id,
  apt_data.title,
  apt_data.description,
  apt_data.start_time,
  apt_data.start_time + (apt_data.duration || ' minutes')::INTERVAL,
  apt_data.status,
  apt_data.priority,
  apt_data.source,
  apt_data.duration,
  p.user_id
FROM organizations o
CROSS JOIN locations l
CROSS JOIN customers c
CROSS JOIN vehicles v
CROSS JOIN appointment_types at
CROSS JOIN profiles p,
(VALUES 
  -- Today's appointments
  ('Oil Change Service', 'Regular maintenance oil change', (CURRENT_DATE + TIME '09:00')::TIMESTAMPTZ, 30, 'confirmed', 'normal', 'phone'),
  ('Brake Inspection', 'Customer reports squeaking brakes', (CURRENT_DATE + TIME '10:30')::TIMESTAMPTZ, 90, 'confirmed', 'high', 'phone'),
  ('Tire Rotation', 'Scheduled tire rotation', (CURRENT_DATE + TIME '14:00')::TIMESTAMPTZ, 45, 'tentative', 'normal', 'online'),
  
  -- Tomorrow's appointments
  ('Engine Diagnostics', 'Check engine light on', (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00')::TIMESTAMPTZ, 120, 'confirmed', 'high', 'phone'),
  ('AC Service', 'Air conditioning not cooling', (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00')::TIMESTAMPTZ, 75, 'confirmed', 'normal', 'walk_in'),
  ('General Inspection', 'Annual safety inspection', (CURRENT_DATE + INTERVAL '1 day' + TIME '15:30')::TIMESTAMPTZ, 60, 'tentative', 'normal', 'online'),
  
  -- Next week appointments
  ('Transmission Service', 'Transmission fluid change', (CURRENT_DATE + INTERVAL '3 days' + TIME '09:30')::TIMESTAMPTZ, 180, 'confirmed', 'normal', 'phone'),
  ('Emergency Repair', 'Vehicle won\'t start', (CURRENT_DATE + INTERVAL '2 days' + TIME '08:00')::TIMESTAMPTZ, 60, 'confirmed', 'urgent', 'phone'),
  ('Consultation', 'Discuss repair options', (CURRENT_DATE + INTERVAL '4 days' + TIME '16:00')::TIMESTAMPTZ, 30, 'tentative', 'low', 'phone'),
  ('Walk-in Service', 'Quick inspection', (CURRENT_DATE + INTERVAL '1 day' + TIME '13:00')::TIMESTAMPTZ, 15, 'confirmed', 'normal', 'walk_in')
) AS apt_data(title, description, start_time, duration, status, priority, source)
WHERE o.name = 'AutoCare Pro' 
  AND l.name = 'Main Location'
  AND c.first_name = 'John' 
  AND v.make = 'Toyota'
  AND at.name LIKE '%' || SPLIT_PART(apt_data.title, ' ', 1) || '%'
  AND p.role = 'OWNER'
LIMIT 10
ON CONFLICT DO NOTHING;

-- Assign resources to appointments
INSERT INTO public.appointment_resources (org_id, appointment_id, resource_id)
SELECT DISTINCT
  a.org_id,
  a.id,
  r.id
FROM public.appointments a
JOIN public.appointment_types at ON a.type_id = at.id
JOIN public.resources r ON r.org_id = a.org_id
WHERE r.type = 'TECHNICIAN'
  AND r.name = CASE 
    WHEN at.name LIKE '%Oil%' THEN 'Mike Johnson'
    WHEN at.name LIKE '%Brake%' THEN 'Sarah Wilson'
    WHEN at.name LIKE '%Engine%' OR at.name LIKE '%Diagnostics%' THEN 'Mike Johnson'
    WHEN at.name LIKE '%Transmission%' THEN 'David Chen'
    WHEN at.name LIKE '%AC%' OR at.name LIKE '%Air%' THEN 'Lisa Garcia'
    WHEN at.name LIKE '%Tire%' THEN 'Tom Anderson'
    ELSE 'Emma Thompson'
  END
ON CONFLICT DO NOTHING;

-- Assign bays to appointments
INSERT INTO public.appointment_resources (org_id, appointment_id, resource_id)
SELECT DISTINCT
  a.org_id,
  a.id,
  r.id
FROM public.appointments a
JOIN public.appointment_types at ON a.type_id = at.id
JOIN public.resources r ON r.org_id = a.org_id
WHERE r.type = 'BAY'
  AND r.name = CASE 
    WHEN at.name LIKE '%Oil%' OR at.name LIKE '%Quick%' THEN 'Bay 1 - Quick Service'
    WHEN at.name LIKE '%Transmission%' OR at.name LIKE '%Heavy%' THEN 'Bay 2 - Heavy Duty'
    WHEN at.name LIKE '%Tire%' OR at.name LIKE '%Alignment%' THEN 'Bay 3 - Alignment'
    ELSE 'Bay 4 - General Service'
  END
ON CONFLICT DO NOTHING;

-- Add appointment services
INSERT INTO public.appointment_services (org_id, appointment_id, description, estimated_minutes, inventory_item_id, quantity)
SELECT 
  a.org_id,
  a.id,
  service_data.description,
  service_data.minutes,
  ii.id,
  service_data.quantity
FROM public.appointments a
JOIN public.appointment_types at ON a.type_id = at.id
LEFT JOIN public.inventory_items ii ON ii.org_id = a.org_id 
  AND (
    (service_data.item_name = 'Engine Oil' AND ii.name LIKE '%Oil%') OR
    (service_data.item_name = 'Oil Filter' AND ii.name LIKE '%Filter%') OR
    (service_data.item_name = 'Brake Pads' AND ii.name LIKE '%Brake%') OR
    (service_data.item_name = 'Air Filter' AND ii.name LIKE '%Air%')
  ),
(VALUES 
  ('Engine oil change with synthetic oil', 20, 'Engine Oil', 5.0),
  ('Replace oil filter', 10, 'Oil Filter', 1.0),
  ('Brake pad inspection and replacement', 60, 'Brake Pads', 2.0),
  ('Brake fluid check', 15, NULL, 0.0),
  ('Tire rotation and pressure check', 30, NULL, 0.0),
  ('Wheel balancing', 15, NULL, 0.0),
  ('OBD-II diagnostic scan', 30, NULL, 0.0),
  ('Engine performance analysis', 60, NULL, 0.0),
  ('AC system pressure test', 30, NULL, 0.0),
  ('Replace cabin air filter', 15, 'Air Filter', 1.0)
) AS service_data(description, minutes, item_name, quantity)
WHERE (
  (at.name LIKE '%Oil%' AND service_data.description LIKE '%oil%') OR
  (at.name LIKE '%Brake%' AND service_data.description LIKE '%brake%') OR
  (at.name LIKE '%Tire%' AND service_data.description LIKE '%tire%') OR
  (at.name LIKE '%Engine%' AND service_data.description LIKE '%diagnostic%') OR
  (at.name LIKE '%AC%' AND service_data.description LIKE '%AC%')
)
ON CONFLICT DO NOTHING;

-- Add some waitlist entries
INSERT INTO public.waitlist (org_id, location_id, customer_id, vehicle_id, preferred_start, preferred_end, notes, status)
SELECT 
  o.id,
  l.id,
  c.id,
  v.id,
  (CURRENT_DATE + INTERVAL '1 week' + TIME '09:00')::TIMESTAMPTZ,
  (CURRENT_DATE + INTERVAL '1 week' + TIME '17:00')::TIMESTAMPTZ,
  'Customer prefers morning appointments',
  'active'
FROM organizations o
CROSS JOIN locations l
CROSS JOIN customers c
CROSS JOIN vehicles v
WHERE o.name = 'AutoCare Pro' 
  AND l.name = 'Main Location'
  AND c.first_name = 'Jane'
  AND v.make = 'Honda'
LIMIT 3
ON CONFLICT DO NOTHING;