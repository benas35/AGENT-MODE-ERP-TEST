-- Fix search path warnings for security functions
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role IN ('OWNER', 'MANAGER') FROM profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will be called after a user signs up
  -- We'll handle profile creation in the application layer
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_next_number(
  entity_type_param TEXT,
  org_id_param UUID,
  location_id_param UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  next_number INTEGER;
  prefix_text TEXT := '';
  formatted_number TEXT;
BEGIN
  -- Get or create sequence record
  INSERT INTO number_sequences (org_id, location_id, entity_type, year, current_number)
  VALUES (org_id_param, location_id_param, entity_type_param, current_year, 0)
  ON CONFLICT (org_id, location_id, entity_type, year) 
  DO NOTHING;
  
  -- Increment and get next number
  UPDATE number_sequences 
  SET current_number = current_number + 1
  WHERE org_id = org_id_param 
    AND (location_id = location_id_param OR (location_id IS NULL AND location_id_param IS NULL))
    AND entity_type = entity_type_param 
    AND year = current_year
  RETURNING current_number INTO next_number;
  
  -- Build prefix based on entity type
  prefix_text := CASE entity_type_param
    WHEN 'estimate' THEN 'EST-'
    WHEN 'work_order' THEN 'WO-'
    WHEN 'invoice' THEN 'INV-'
    WHEN 'purchase_order' THEN 'PO-'
    ELSE UPPER(entity_type_param) || '-'
  END;
  
  -- Format with year and zero-padded number
  formatted_number := prefix_text || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$;