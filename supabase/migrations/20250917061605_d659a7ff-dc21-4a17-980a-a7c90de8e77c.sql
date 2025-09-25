-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM profiles WHERE user_id = auth.uid();
$$;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

-- Helper function to check if user is admin/owner
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('OWNER', 'MANAGER') FROM profiles WHERE user_id = auth.uid();
$$;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles in their org" ON profiles
  FOR SELECT USING (is_admin() AND org_id = get_user_org_id());

CREATE POLICY "Admins can update profiles in their org" ON profiles
  FOR UPDATE USING (is_admin() AND org_id = get_user_org_id());

CREATE POLICY "Admins can insert profiles in their org" ON profiles
  FOR INSERT WITH CHECK (is_admin() AND org_id = get_user_org_id());

-- Create RLS policies for organizations table
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (get_user_role() = 'OWNER' AND id = get_user_org_id());

CREATE POLICY "Anyone can create an organization" ON organizations
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for locations table
CREATE POLICY "Users can view locations in their org" ON locations
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage locations in their org" ON locations
  FOR ALL USING (is_admin() AND org_id = get_user_org_id());

-- Create RLS policies for customers table
CREATE POLICY "Users can view customers in their org" ON customers
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage customers" ON customers
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for vehicles table  
CREATE POLICY "Users can view vehicles in their org" ON vehicles
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage vehicles" ON vehicles
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'FRONT_DESK')
  );

-- Create RLS policies for vendors table
CREATE POLICY "Users can view vendors in their org" ON vendors
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage vendors" ON vendors
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'PARTS_MANAGER')
  );

-- Create RLS policies for inventory_items table
CREATE POLICY "Users can view inventory in their org" ON inventory_items
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage inventory" ON inventory_items
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'PARTS_MANAGER', 'TECHNICIAN')
  );

-- Create RLS policies for estimates table
CREATE POLICY "Users can view estimates in their org" ON estimates
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage estimates" ON estimates
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for work_orders table
CREATE POLICY "Users can view work orders in their org" ON work_orders
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage work orders" ON work_orders
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'FRONT_DESK')
  );

-- Create RLS policies for estimate_items table
CREATE POLICY "Users can view estimate items in their org" ON estimate_items
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage estimate items" ON estimate_items
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for work_order_items table
CREATE POLICY "Users can view work order items in their org" ON work_order_items
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage work order items" ON work_order_items
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'FRONT_DESK')
  );

-- Create RLS policies for invoices table
CREATE POLICY "Users can view invoices in their org" ON invoices
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage invoices" ON invoices
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for invoice_items table
CREATE POLICY "Users can view invoice items in their org" ON invoice_items
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage invoice items" ON invoice_items
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for payments table
CREATE POLICY "Users can view payments in their org" ON payments
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage payments" ON payments
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for purchase_orders table
CREATE POLICY "Users can view purchase orders in their org" ON purchase_orders
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage purchase orders" ON purchase_orders
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'PARTS_MANAGER')
  );

-- Create RLS policies for purchase_order_items table
CREATE POLICY "Users can view purchase order items in their org" ON purchase_order_items
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage purchase order items" ON purchase_order_items
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'PARTS_MANAGER')
  );

-- Create RLS policies for stock_movements table
CREATE POLICY "Users can view stock movements in their org" ON stock_movements
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage stock movements" ON stock_movements
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'PARTS_MANAGER', 'TECHNICIAN')
  );

-- Create RLS policies for time_logs table
CREATE POLICY "Users can view their own time logs" ON time_logs
  FOR SELECT USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR is_admin()));

CREATE POLICY "Technicians can manage their own time logs" ON time_logs
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    (user_id = auth.uid() OR get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR'))
  );

-- Create RLS policies for appointments table
CREATE POLICY "Users can view appointments in their org" ON appointments
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can manage appointments" ON appointments
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for attachments table
CREATE POLICY "Users can view attachments in their org" ON attachments
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can manage attachments in their org" ON attachments
  FOR ALL USING (org_id = get_user_org_id());

-- Create RLS policies for service_reminders table
CREATE POLICY "Users can view service reminders in their org" ON service_reminders
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Service advisors can manage service reminders" ON service_reminders
  FOR ALL USING (
    org_id = get_user_org_id() AND 
    get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
  );

-- Create RLS policies for notifications table
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (org_id = get_user_org_id() AND (user_id = auth.uid() OR user_id IS NULL));

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (org_id = get_user_org_id() AND user_id = auth.uid());

CREATE POLICY "Admins can manage notifications in their org" ON notifications
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- Create RLS policies for audit_log table
CREATE POLICY "Admins can view audit log in their org" ON audit_log
  FOR SELECT USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "Users can insert audit log entries" ON audit_log
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Create RLS policies for number_sequences table
CREATE POLICY "Users can view number sequences in their org" ON number_sequences
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage number sequences in their org" ON number_sequences
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- Create RLS policies for feature_flags table
CREATE POLICY "Users can view feature flags in their org" ON feature_flags
  FOR SELECT USING (org_id = get_user_org_id() OR org_id IS NULL);

CREATE POLICY "Owners can manage feature flags in their org" ON feature_flags
  FOR ALL USING ((org_id = get_user_org_id() OR org_id IS NULL) AND get_user_role() = 'OWNER');

-- Create trigger function for handling new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called after a user signs up
  -- We'll handle profile creation in the application layer
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate next number in sequence
CREATE OR REPLACE FUNCTION generate_next_number(
  entity_type_param TEXT,
  org_id_param UUID,
  location_id_param UUID DEFAULT NULL
)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;