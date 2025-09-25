-- Create sample tire storage records now that customers exist
INSERT INTO tire_storage (
  id, org_id, customer_id, vehicle_id, tire_brand, tire_size, season, 
  quantity, rack_location, position, condition, tread_depth, stored_date, 
  notes, next_reminder_date, created_by
) VALUES
(
  '00000000-0000-0000-0000-000000000040', 
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000020',
  'Michelin X-Ice', 
  '215/60R16',
  'WINTER',
  4,
  'A-1',
  'TOP',
  'EXCELLENT',
  8.5,
  '2024-04-15',
  'Customer wants these mounted in October',
  '2024-10-01',
  '00000000-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000001', 
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000021',
  'Continental ContiSport',
  '225/65R17',
  'SUMMER',
  4,
  'B-3',
  'MIDDLE',
  'GOOD',
  6.2,
  '2024-09-20',
  'Minor sidewall scuff on one tire',
  '2025-04-15',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;