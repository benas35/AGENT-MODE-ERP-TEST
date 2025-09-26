-- Create technicians table
CREATE TABLE IF NOT EXISTS public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  color text DEFAULT '#3B82F6',
  skills text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  capacity_minutes integer DEFAULT 480,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add technician_id to appointments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'technician_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add new enum values to existing appointment_status enum
DO $$
BEGIN
  -- Add missing enum values if they don't exist
  BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'booked';
    EXCEPTION WHEN duplicate_object THEN null;
  END;
  BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'checked_in';
    EXCEPTION WHEN duplicate_object THEN null;
  END;
  BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'in_progress';
    EXCEPTION WHEN duplicate_object THEN null;
  END;
  BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'waiting_parts';
    EXCEPTION WHEN duplicate_object THEN null;
  END;
  BEGIN
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'done';
    EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_technician_start ON public.appointments(technician_id, start_time);
CREATE INDEX IF NOT EXISTS idx_technicians_org_active ON public.technicians(org_id, is_active);

-- Enable RLS on technicians
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- RLS policies for technicians
DROP POLICY IF EXISTS "Admins can manage technicians" ON public.technicians;
DROP POLICY IF EXISTS "All users can view active technicians" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can view themselves" ON public.technicians;

CREATE POLICY "Admins can manage technicians" ON public.technicians
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "All users can view active technicians" ON public.technicians
  FOR SELECT USING (org_id = get_user_org_id() AND is_active = true);

CREATE POLICY "Technicians can view themselves" ON public.technicians
  FOR SELECT USING (profile_id = auth.uid());

-- Update appointment RLS policies to fix the insert issue
DROP POLICY IF EXISTS "Service staff can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view appointments in their org" ON public.appointments;
DROP POLICY IF EXISTS "Admins and service advisors can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Technicians can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "All users can view appointments" ON public.appointments;

CREATE POLICY "Admins and service advisors can manage all appointments" ON public.appointments
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

CREATE POLICY "Technicians can manage own appointments" ON public.appointments
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() = 'TECHNICIAN' AND 
    (technician_id IN (SELECT id FROM technicians WHERE profile_id = auth.uid()) OR assigned_to = auth.uid())
  );

CREATE POLICY "All users can view appointments" ON public.appointments
  FOR SELECT USING (org_id = get_user_org_id());

-- Add trigger for updated_at on technicians
DROP TRIGGER IF EXISTS update_technicians_updated_at ON public.technicians;
CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo technicians if none exist
INSERT INTO public.technicians (org_id, display_name, color, skills, is_active, capacity_minutes)
SELECT 
  (SELECT id FROM public.organizations LIMIT 1) as org_id,
  tech.display_name,
  tech.color,
  tech.skills,
  true,
  480
FROM (
  VALUES 
    ('Mike Johnson', '#FF6B6B', ARRAY['engine', 'diagnostics']),
    ('Sarah Wilson', '#4ECDC4', ARRAY['brakes', 'suspension']),  
    ('Tom Anderson', '#FFEAA7', ARRAY['tires', 'alignment'])
) AS tech(display_name, color, skills)
WHERE NOT EXISTS (SELECT 1 FROM public.technicians LIMIT 1);