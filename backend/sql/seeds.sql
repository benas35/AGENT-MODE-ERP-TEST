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

-- Seed internal profiles for messaging
insert into profiles (id, org_id, role, first_name, last_name, email, active)
values
  (
    '550e8400-e29b-41d4-a716-446655440100',
    '550e8400-e29b-41d4-a716-446655440000',
    'OWNER',
    'Austeja',
    'Petrauskiene',
    'austeja@profixauto.com',
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440000',
    'SERVICE_ADVISOR',
    'Matas',
    'Stonys',
    'matas@profixauto.com',
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440102',
    '550e8400-e29b-41d4-a716-446655440000',
    'TECHNICIAN',
    'Greta',
    'Kavaliauskaite',
    'greta@profixauto.com',
    true
  ),
  (
    '550e8400-e29b-41d4-a716-446655440103',
  '550e8400-e29b-41d4-a716-446655440000',
  'MANAGER',
  'Lukas',
  'Sirvydis',
  'lukas@profixauto.com',
  true
)
on conflict (id) do update set
  org_id = excluded.org_id,
  role = excluded.role,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  active = excluded.active;

insert into customer_notification_preferences (id, org_id, customer_id)
values (
  '550e8400-e29b-41d4-a716-446655440b00',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010'
)
on conflict (customer_id) do update set
  notify_email = excluded.notify_email,
  notify_sms = excluded.notify_sms,
  notify_whatsapp = excluded.notify_whatsapp,
  updated_at = now();

insert into customer_portal_sessions (
  id,
  org_id,
  customer_id,
  work_order_id,
  magic_token,
  expires_at,
  created_by
)
values (
  '550e8400-e29b-41d4-a716-446655440b10',
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440a00',
  '0e1b6a9030fce5df6c60d3ab8df27948b63ab095b33f7cb9a8f28c1af7f53fb9',
  now() + interval '7 days',
  '550e8400-e29b-41d4-a716-446655440101'
)
on conflict (id) do update set
  expires_at = excluded.expires_at,
  magic_token = excluded.magic_token;

insert into customer_messages (
  id,
  org_id,
  work_order_id,
  customer_id,
  sender_profile_id,
  direction,
  body,
  metadata,
  created_at
)
values
  (
    '550e8400-e29b-41d4-a716-446655440b20',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440101',
    'staff',
    'We found a leaking caliper seal. Please review the photo evidence and approve.',
    '{"type": "estimate", "estimate_id": "EST-2025-1001"}'::jsonb,
    now() - interval '30 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440b21',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    '550e8400-e29b-41d4-a716-446655440010',
    null,
    'customer',
    'Thanks for the update! Can you confirm warranty coverage before I approve?',
    '{"type": "question"}'::jsonb,
    now() - interval '20 minutes'
  )
on conflict (id) do update set
  body = excluded.body,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

-- Seed messaging threads and messages
insert into message_threads (id, org_id, work_order_id, participants, last_message_at, created_at)
values
  (
    '550e8400-e29b-41d4-a716-446655440c00',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440a00',
    array[
      '550e8400-e29b-41d4-a716-446655440100',
      '550e8400-e29b-41d4-a716-446655440101',
      '550e8400-e29b-41d4-a716-446655440102'
    ]::uuid[],
    now() - interval '10 minutes',
    now() - interval '1 day'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440c01',
    '550e8400-e29b-41d4-a716-446655440000',
    null,
    array[
      '550e8400-e29b-41d4-a716-446655440100',
      '550e8400-e29b-41d4-a716-446655440103'
    ]::uuid[],
    now() - interval '2 hours',
    now() - interval '2 days'
  )
on conflict (id) do update set
  org_id = excluded.org_id,
  work_order_id = excluded.work_order_id,
  participants = excluded.participants,
  last_message_at = excluded.last_message_at;

insert into internal_messages (
  id,
  org_id,
  thread_id,
  sender_id,
  recipient_id,
  work_order_id,
  body,
  priority,
  attachments,
  created_at
)
values
  (
    '550e8400-e29b-41d4-a716-446655440d00',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440c00',
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440102',
    '550e8400-e29b-41d4-a716-446655440a00',
    'Can you confirm the brake caliper torque specs before we close?',
    'normal',
    '[{"storage_path": "demo/orgs/profix-auto/work-orders/550e8400-e29b-41d4-a716-446655440a00/caliper.webp", "name": "Caliper leak"}]'::jsonb,
    now() - interval '45 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440d01',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440c00',
    '550e8400-e29b-41d4-a716-446655440102',
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440a00',
    'Torque confirmed and photo uploaded to the DVI. Ready for advisor review.',
    'normal',
    '[]'::jsonb,
    now() - interval '40 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440d02',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440c00',
    '550e8400-e29b-41d4-a716-446655440101',
    null,
    '550e8400-e29b-41d4-a716-446655440a00',
    'Great work. Marking as urgent to ensure QA signs off before delivery.',
    'urgent',
    '[]'::jsonb,
    now() - interval '35 minutes'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440d10',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440c01',
    '550e8400-e29b-41d4-a716-446655440103',
    '550e8400-e29b-41d4-a716-446655440100',
    null,
    'Reminder that the compliance audit starts at 16:00. Need your approval on the updated checklist.',
    'normal',
    '[]'::jsonb,
    now() - interval '90 minutes'
  )
on conflict (id) do update set
  body = excluded.body,
  priority = excluded.priority,
  attachments = excluded.attachments,
  created_at = excluded.created_at;

set session_replication_role = origin;
