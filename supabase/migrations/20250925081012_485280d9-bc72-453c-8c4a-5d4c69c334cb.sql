-- Fix profiles table creation with correct auth.users reference
-- First, check if profiles exists and drop it if it has issues
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with proper reference to auth.users
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'TECHNICIAN',
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get default organization (for demo purposes, use first org)
  SELECT id INTO default_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  -- If no org exists, create one
  IF default_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, created_by) 
    VALUES ('Demo Auto Shop', 'demo', NEW.id)
    RETURNING id INTO default_org_id;
  END IF;

  -- Create profile for new user
  INSERT INTO public.profiles (
    id, 
    org_id, 
    role, 
    first_name, 
    last_name, 
    email
  ) VALUES (
    NEW.id,
    default_org_id,
    'TECHNICIAN', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing functions to work with new profile structure
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Add trigger for updated_at
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();