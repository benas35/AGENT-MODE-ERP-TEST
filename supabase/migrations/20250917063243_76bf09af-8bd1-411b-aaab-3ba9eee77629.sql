-- Create planner-specific tables for the Auto Repair ERP scheduling system

-- Scheduler settings per location
CREATE TABLE public.scheduler_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  location_id UUID,
  day_start TIME DEFAULT '07:00',
  day_end TIME DEFAULT '20:00',
  slot_minutes INTEGER DEFAULT 15,
  allow_double_booking BOOLEAN DEFAULT false,
  default_view TEXT DEFAULT 'week',
  overbook_policy TEXT,
  cancellation_policy TEXT,
  reminder_lead_minutes INTEGER[] DEFAULT '{1440,120}', -- 24 hours and 2 hours
  booking_window_days INTEGER DEFAULT 90,
  timezone TEXT DEFAULT 'Europe/Vilnius',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, location_id)
);

-- Resources (technicians, bays, courtesy cars)
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  location_id UUID,
  type TEXT NOT NULL CHECK (type IN ('TECHNICIAN', 'BAY', 'COURTESY_CAR')),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  capacity INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resource availability by weekday
CREATE TABLE public.resource_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resource time off periods
CREATE TABLE public.resource_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Appointment types
CREATE TABLE public.appointment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_duration_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#10B981',
  requires_vehicle BOOLEAN DEFAULT true,
  requires_customer BOOLEAN DEFAULT true,
  default_services JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Extend appointments table with new columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS type_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'tentative' CHECK (status IN ('tentative', 'confirmed', 'in_service', 'no_show', 'cancelled', 'completed'));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'phone' CHECK (source IN ('phone', 'walk_in', 'online', 'internal'));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rrule TEXT; -- recurrence rule
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS exdates TIMESTAMP WITH TIME ZONE[]; -- exception dates
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 60;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_advisor UUID;

-- Junction table for appointment resources
CREATE TABLE public.appointment_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(appointment_id, resource_id)
);

-- Appointment services
CREATE TABLE public.appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  description TEXT NOT NULL,
  estimated_minutes INTEGER DEFAULT 60,
  inventory_item_id UUID,
  quantity NUMERIC DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Waitlist for customers wanting to get scheduled
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  location_id UUID,
  customer_id UUID NOT NULL,
  vehicle_id UUID,
  preferred_start TIMESTAMP WITH TIME ZONE,
  preferred_end TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'scheduled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.scheduler_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduler_settings
CREATE POLICY "Users can view scheduler settings in their org" ON public.scheduler_settings
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage scheduler settings" ON public.scheduler_settings
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- RLS Policies for resources
CREATE POLICY "Users can view resources in their org" ON public.resources
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage resources" ON public.resources
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- RLS Policies for resource_availability
CREATE POLICY "Users can view resource availability in their org" ON public.resource_availability
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage resource availability" ON public.resource_availability
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- RLS Policies for resource_time_off
CREATE POLICY "Users can view resource time off in their org" ON public.resource_time_off
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage resource time off" ON public.resource_time_off
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- RLS Policies for appointment_types
CREATE POLICY "Users can view appointment types in their org" ON public.appointment_types
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage appointment types" ON public.appointment_types
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role]));

-- RLS Policies for appointment_resources
CREATE POLICY "Users can view appointment resources in their org" ON public.appointment_resources
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage appointment resources" ON public.appointment_resources
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role]));

-- RLS Policies for appointment_services
CREATE POLICY "Users can view appointment services in their org" ON public.appointment_services
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage appointment services" ON public.appointment_services
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role]));

-- RLS Policies for waitlist
CREATE POLICY "Users can view waitlist in their org" ON public.waitlist
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage waitlist" ON public.waitlist
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role]));

-- Create indexes for performance
CREATE INDEX idx_scheduler_settings_org_location ON public.scheduler_settings(org_id, location_id);
CREATE INDEX idx_resources_org_type_active ON public.resources(org_id, type, active);
CREATE INDEX idx_resource_availability_resource_weekday ON public.resource_availability(resource_id, weekday);
CREATE INDEX idx_resource_time_off_resource_times ON public.resource_time_off(resource_id, start_time, end_time);
CREATE INDEX idx_appointment_types_org_active ON public.appointment_types(org_id, active);
CREATE INDEX idx_appointments_org_start_status ON public.appointments(org_id, start_time, status);
CREATE INDEX idx_appointment_resources_appointment ON public.appointment_resources(appointment_id);
CREATE INDEX idx_appointment_resources_resource ON public.appointment_resources(resource_id);
CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_waitlist_org_status ON public.waitlist(org_id, status);

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_scheduler_settings_updated_at
  BEFORE UPDATE ON public.scheduler_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();