-- Phase 4: Digital Vehicle Inspections (DVI) Enhancement
-- Add comprehensive DVI system with inspection items and results

-- Create inspection_results table for individual check results
CREATE TABLE IF NOT EXISTS inspection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  dvi_id UUID NOT NULL REFERENCES dvis(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL, -- matches template item key
  status TEXT NOT NULL CHECK (status IN ('OK', 'ATTENTION', 'FAIL', 'NOT_APPLICABLE')),
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb, -- array of photo URLs/metadata
  videos JSONB DEFAULT '[]'::jsonb, -- array of video URLs/metadata
  measurements JSONB DEFAULT '{}'::jsonb, -- any numeric measurements
  recommendations TEXT,
  cost_estimate NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'LOW' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on inspection_results
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspection_results
CREATE POLICY "Service staff can manage inspection results"
ON inspection_results FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role])));

CREATE POLICY "Users can view inspection results in their org"
ON inspection_results FOR SELECT
USING (org_id = get_user_org_id());

-- Create dvi_signatures table for digital signatures
CREATE TABLE IF NOT EXISTS dvi_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  dvi_id UUID NOT NULL REFERENCES dvis(id) ON DELETE CASCADE,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('CUSTOMER', 'TECHNICIAN', 'ADVISOR')),
  signature_data TEXT NOT NULL, -- base64 encoded signature
  signer_name TEXT NOT NULL,
  signer_title TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on dvi_signatures  
ALTER TABLE dvi_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for dvi_signatures
CREATE POLICY "Service staff can manage DVI signatures"
ON dvi_signatures FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role])));

-- Phase 6: Enhanced Work Orders & Workflow
-- Add work order items table for detailed line items
CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  work_order_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('LABOR', 'PART', 'SUBCONTRACT', 'MISC')),
  description TEXT NOT NULL,
  inventory_item_id UUID, -- FK to inventory_items for parts
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percentage NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price - discount_amount) STORED,
  labor_hours NUMERIC, -- for labor items
  technician_id UUID, -- assigned technician
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on work_order_items
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_order_items
CREATE POLICY "Service staff can manage work order items"
ON work_order_items FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'TECHNICIAN'::app_role])));

-- Phase 8: Customer Communications Hub
-- Create communications log table
CREATE TABLE IF NOT EXISTS communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  customer_id UUID,
  work_order_id UUID,
  appointment_id UUID,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('SMS', 'EMAIL', 'PHONE', 'IN_PERSON', 'PORTAL')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('DRAFT', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  sender_id UUID, -- user who sent it
  recipient_info JSONB NOT NULL, -- phone/email/address
  provider_response JSONB DEFAULT '{}', -- response from SMS/email provider
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on communication_log
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for communication_log
CREATE POLICY "Service staff can manage communications"
ON communication_log FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role])));

-- Create customer_portal_access table
CREATE TABLE IF NOT EXISTS customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  permissions JSONB DEFAULT '["view_vehicles", "view_work_orders", "approve_estimates"]'::jsonb,
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on customer_portal_access
ALTER TABLE customer_portal_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_portal_access
CREATE POLICY "Service staff can manage portal access"
ON customer_portal_access FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role])));

-- Phase 10: Payment Integration
-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  customer_id UUID,
  type TEXT NOT NULL CHECK (type IN ('CARD', 'BANK_ACCOUNT', 'DIGITAL_WALLET')),
  provider TEXT NOT NULL DEFAULT 'STRIPE',
  provider_id TEXT NOT NULL, -- Stripe payment method ID
  last_four TEXT,
  brand TEXT, -- Visa, MasterCard, etc.
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  billing_address JSONB,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_methods
CREATE POLICY "Service staff can manage payment methods"
ON payment_methods FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role])));

-- Create payment_intents table for tracking payment attempts
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  invoice_id UUID,
  customer_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'STRIPE',
  provider_intent_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  payment_method_id UUID,
  failure_reason TEXT,
  provider_response JSONB DEFAULT '{}',
  fees NUMERIC DEFAULT 0,
  net_amount NUMERIC GENERATED ALWAYS AS (amount - fees) STORED,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_intents
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_intents
CREATE POLICY "Service staff can manage payment intents"
ON payment_intents FOR ALL
USING (org_id = get_user_org_id() AND (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'SERVICE_ADVISOR'::app_role, 'FRONT_DESK'::app_role])));

-- Add triggers for updated_at
CREATE TRIGGER update_inspection_results_updated_at
  BEFORE UPDATE ON inspection_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_items_updated_at
  BEFORE UPDATE ON work_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_log_updated_at
  BEFORE UPDATE ON communication_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_portal_access_updated_at
  BEFORE UPDATE ON customer_portal_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();