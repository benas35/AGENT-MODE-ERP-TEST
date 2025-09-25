-- Create tire storage table
CREATE TABLE IF NOT EXISTS public.tire_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tire_brand text NOT NULL,
  tire_size text NOT NULL,
  season text NOT NULL CHECK (season IN ('SUMMER', 'WINTER', 'ALL_SEASON')),
  quantity integer NOT NULL DEFAULT 4,
  rack_location text NOT NULL,
  position text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
  tread_depth numeric(4,2),
  stored_date date NOT NULL DEFAULT CURRENT_DATE,
  removal_date date,
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  next_reminder_date date,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true
);

-- Enable RLS on tire_storage
ALTER TABLE public.tire_storage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tire storage
CREATE POLICY "Users can view tire storage in their org" ON public.tire_storage
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage tire storage" ON public.tire_storage
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Add trigger for updated_at
CREATE TRIGGER trigger_update_tire_storage_updated_at
    BEFORE UPDATE ON public.tire_storage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create some demo tire storage records
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