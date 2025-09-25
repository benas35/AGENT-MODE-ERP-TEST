-- Fixed seed data with proper enum casting

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

-- Add some waitlist entries first (simpler structure)
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