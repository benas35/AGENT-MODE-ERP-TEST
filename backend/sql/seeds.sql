-- Seed demo media data for Phase 1.1
set session_replication_role = replica;

-- Ensure demo organization exists
insert into organizations (id, name, slug, currency, locale, timezone)
values (
  '550e8400-e29b-41d4-a716-446655440000',
  'ProFix Auto Services',
  'profix-auto',
  'EUR',
  'en',
  'Europe/Vilnius'
)
on conflict (id) do nothing;

-- Ensure demo customer exists
insert into customers (id, org_id, first_name, last_name, email, phone)
values (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440000',
  'Jonas',
  'Jonaitis',
  'jonas.jonaitis@email.com',
  '+37061234567'
)
on conflict (id) do nothing;

-- Ensure demo vehicle exists
insert into vehicles (id, org_id, customer_id, vin, license_plate, make, model, year, color, mileage)
values (
  '550e8400-e29b-41d4-a716-446655440020',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'WVWZZZ1JZ3W386752',
  'ABC123',
  'Volkswagen',
  'Golf',
  2019,
  'Blue',
  45000
)
on conflict (id) do nothing;

-- Seed vehicle media placeholders
insert into vehicle_media (id, org_id, vehicle_id, kind, storage_path, caption, sort_order)
values
  (
    '550e8400-e29b-41d4-a716-446655440901',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440020',
    'hero',
    'demo/orgs/profix-auto/vehicles/550e8400-e29b-41d4-a716-446655440020/hero.webp',
    'Hero shot for customer portal',
    0
  ),
  (
    '550e8400-e29b-41d4-a716-446655440902',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440020',
    'front',
    'demo/orgs/profix-auto/vehicles/550e8400-e29b-41d4-a716-446655440020/front.webp',
    'Front profile on arrival',
    1
  ),
  (
    '550e8400-e29b-41d4-a716-446655440903',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440020',
    'damage',
    'demo/orgs/profix-auto/vehicles/550e8400-e29b-41d4-a716-446655440020/damage.webp',
    'Customer reported bumper scuff',
    2
  )
  on conflict (id) do nothing;

-- Seed demo work order and media
insert into work_orders (
  id,
  org_id,
  location_id,
  work_order_number,
  customer_id,
  vehicle_id,
  status,
  priority,
  title,
  description,
  created_by
)
values (
  '550e8400-e29b-41d4-a716-446655440a00',
  '550e8400-e29b-41d4-a716-446655440000',
  null,
  'WO-2025-1001',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440020',
  'IN_PROGRESS',
  'high',
  '60k km service with brake inspection',
  'Comprehensive service package including brake diagnostics.',
  '550e8400-e29b-41d4-a716-446655440999'
)
on conflict (id) do nothing;

insert into work_order_media (
  id,
  org_id,
  work_order_id,
  uploaded_by,
  category,
  storage_path,
  caption,
  gps
)
values
  (
    '550e8400-e29b-41d4-a716-446655440a10',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440999',
    'before',
    'demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/intake.webp',
    'Initial inspection - front axle',
    '{"lat": 54.6872, "lng": 25.2797, "accuracy": 6}'::jsonb
  ),
  (
    '550e8400-e29b-41d4-a716-446655440a11',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440999',
    'issue',
    'demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/caliper.webp',
    'Caliper leak documented for approval',
    '{"lat": 54.6872, "lng": 25.2797, "accuracy": 5}'::jsonb
  ),
  (
    '550e8400-e29b-41d4-a716-446655440a12',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440999',
    'after',
    'demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/completed.webp',
    'Repairs completed and verified',
    '{"lat": 54.6872, "lng": 25.2797, "accuracy": 4}'::jsonb
  ),
  (
    '550e8400-e29b-41d4-a716-446655440a13',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440999',
    'progress',
    'demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/progress.webp',
    'Suspension rebuild progress shot',
    '{"lat": 54.6872, "lng": 25.2797, "accuracy": 4}'::jsonb
  ),
  (
    '550e8400-e29b-41d4-a716-446655440a14',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440999',
    'damage',
    'demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/damage.webp',
    'Customer-authorized bumper damage documentation',
    '{"lat": 54.6872, "lng": 25.2797, "accuracy": 3}'::jsonb
  )
  on conflict (id) do nothing;

set session_replication_role = origin;
