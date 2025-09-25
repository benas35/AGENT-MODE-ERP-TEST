-- First let's add authentication and user management enhancements
-- Add authentication trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create a profile for new users with default role
  INSERT INTO public.profiles (user_id, org_id, role, active)
  VALUES (
    NEW.id,
    -- For now we'll use a default org_id, this should be set by the application
    (SELECT id FROM organizations LIMIT 1),
    'VIEWER'::app_role,
    true
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR each ROW execute PROCEDURE public.handle_new_user();

-- Add time tracking tables
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  work_order_id UUID,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,
  total_minutes INTEGER GENERATED ALWAYS AS 
    (CASE WHEN clock_out IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (clock_out - clock_in))/60 - break_minutes 
    ELSE 0 END) STORED,
  status TEXT DEFAULT 'CLOCKED_IN' CHECK (status IN ('CLOCKED_IN', 'ON_BREAK', 'CLOCKED_OUT')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_entries
CREATE POLICY "Users can view their own time entries"
ON time_entries FOR SELECT
USING (user_id = auth.uid() OR (org_id = get_user_org_id() AND is_admin()));

CREATE POLICY "Users can insert their own time entries"
ON time_entries FOR INSERT
WITH CHECK (user_id = auth.uid() AND org_id = get_user_org_id());

CREATE POLICY "Users can update their own time entries"
ON time_entries FOR UPDATE
USING (user_id = auth.uid() OR (org_id = get_user_org_id() AND is_admin()));

-- Create time_off_requests table
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('VACATION', 'SICK', 'PERSONAL', 'HOLIDAY')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC NOT NULL DEFAULT 8,
  reason TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on time_off_requests
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_off_requests
CREATE POLICY "Users can manage their time off requests"
ON time_off_requests FOR ALL
USING (user_id = auth.uid() OR (org_id = get_user_org_id() AND is_admin()));

-- Add VIN decoding cache table
CREATE TABLE IF NOT EXISTS vin_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  vin TEXT NOT NULL,
  decoded_data JSONB NOT NULL,
  provider TEXT NOT NULL DEFAULT 'NHTSA',
  cached_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  UNIQUE(vin, provider)
);

-- Enable RLS on vin_cache
ALTER TABLE vin_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for vin_cache
CREATE POLICY "Users can view VIN cache in their org"
ON vin_cache FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "System can manage VIN cache"
ON vin_cache FOR ALL
USING (org_id = get_user_org_id());

-- Add updated_at triggers for new tables
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, category, key)
);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings
CREATE POLICY "Admins can manage system settings"
ON system_settings FOR ALL
USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can view system settings"
ON system_settings FOR SELECT
USING (org_id = get_user_org_id());

-- Add trigger for system_settings
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (org_id, category, key, value, description)
SELECT 
  o.id,
  'time_clock',
  'default_hours_per_day',
  '8'::jsonb,
  'Default working hours per day'
FROM organizations o
ON CONFLICT (org_id, category, key) DO NOTHING;

INSERT INTO system_settings (org_id, category, key, value, description)
SELECT 
  o.id,
  'time_clock', 
  'break_duration_minutes',
  '30'::jsonb,
  'Default break duration in minutes'
FROM organizations o
ON CONFLICT (org_id, category, key) DO NOTHING;