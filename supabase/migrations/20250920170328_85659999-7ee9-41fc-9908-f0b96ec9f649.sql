-- Create part categories table
CREATE TABLE IF NOT EXISTS part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES part_categories(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  sku text NOT NULL,
  part_no text NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES part_categories(id),
  uom text NOT NULL DEFAULT 'ea',
  barcode text,
  brand text,
  is_serialized boolean DEFAULT false,
  track_lot boolean DEFAULT false,
  cost_method text NOT NULL DEFAULT 'average',
  tax_code_id uuid,
  attributes jsonb DEFAULT '{}',
  default_supplier_id uuid,
  default_warehouse_id uuid,
  default_bin_id uuid,
  min_stock numeric(12,3) DEFAULT 0,
  max_stock numeric(12,3) DEFAULT 0,
  reorder_point numeric(12,3) DEFAULT 0,
  reorder_qty numeric(12,3) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  vat_id text,
  currency text NOT NULL DEFAULT 'EUR',
  payment_terms text DEFAULT 'NET30',
  email text,
  phone text,
  address jsonb DEFAULT '{}',
  lead_time_days integer DEFAULT 3,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warehouses table (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warehouses') THEN
    CREATE TABLE warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      location_id uuid REFERENCES locations(id),
      name text NOT NULL,
      code text NOT NULL,
      address jsonb DEFAULT '{}',
      active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END
$$;

-- Create bins table
CREATE TABLE IF NOT EXISTS bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  location_details text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create goods_receipts table
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text DEFAULT 'draft',
  received_at timestamptz DEFAULT now(),
  received_by uuid NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create goods_receipt_lines table
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  goods_receipt_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES purchase_order_items(id),
  part_id uuid NOT NULL REFERENCES parts(id),
  qty_received numeric(12,3) NOT NULL,
  uom text DEFAULT 'ea',
  unit_cost numeric(14,4) NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  bin_id uuid REFERENCES bins(id),
  lot_no text,
  serial_no text,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);

-- Create supplier_invoices table
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  number text NOT NULL,
  invoice_date date NOT NULL,
  currency text DEFAULT 'EUR',
  fx_rate numeric(12,6) DEFAULT 1,
  subtotal numeric(14,2) DEFAULT 0,
  tax_total numeric(14,2) DEFAULT 0,
  freight numeric(14,2) DEFAULT 0,
  discount_total numeric(14,2) DEFAULT 0,
  grand_total numeric(14,2) DEFAULT 0,
  status text DEFAULT 'open',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stock_ledger table
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  part_id uuid NOT NULL REFERENCES parts(id),
  warehouse_id uuid REFERENCES warehouses(id),
  bin_id uuid REFERENCES bins(id),
  txn_type text NOT NULL,
  qty_delta numeric(14,3) NOT NULL,
  unit_cost numeric(14,6) NOT NULL,
  value_delta numeric(16,4) NOT NULL,
  ref_type text NOT NULL,
  ref_id uuid,
  ref_line_id uuid,
  lot_no text,
  serial_no text,
  occurred_at timestamptz DEFAULT now(),
  created_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_org_sku ON parts(org_id, sku);
CREATE INDEX IF NOT EXISTS idx_parts_org_part_no ON parts(org_id, part_no);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_org_part ON stock_ledger(org_id, part_id);

-- Enable RLS
ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
  -- Part categories policies
  DROP POLICY IF EXISTS "Users can view part categories in their org" ON part_categories;
  DROP POLICY IF EXISTS "Managers can manage part categories" ON part_categories;
  
  CREATE POLICY "Users can view part categories in their org" ON part_categories
    FOR SELECT USING (org_id = get_user_org_id());
  
  CREATE POLICY "Managers can manage part categories" ON part_categories
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

  -- Parts policies
  DROP POLICY IF EXISTS "Users can view parts in their org" ON parts;
  DROP POLICY IF EXISTS "Parts managers can manage parts" ON parts;
  
  CREATE POLICY "Users can view parts in their org" ON parts
    FOR SELECT USING (org_id = get_user_org_id());
  
  CREATE POLICY "Parts managers can manage parts" ON parts
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

  -- Suppliers policies
  DROP POLICY IF EXISTS "Users can view suppliers in their org" ON suppliers;
  DROP POLICY IF EXISTS "Managers can manage suppliers" ON suppliers;
  
  CREATE POLICY "Users can view suppliers in their org" ON suppliers
    FOR SELECT USING (org_id = get_user_org_id());
  
  CREATE POLICY "Managers can manage suppliers" ON suppliers
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

  -- Stock ledger policies
  DROP POLICY IF EXISTS "Users can view stock ledger in their org" ON stock_ledger;
  DROP POLICY IF EXISTS "Parts staff can insert stock ledger entries" ON stock_ledger;
  
  CREATE POLICY "Users can view stock ledger in their org" ON stock_ledger
    FOR SELECT USING (org_id = get_user_org_id());
  
  CREATE POLICY "Parts staff can insert stock ledger entries" ON stock_ledger
    FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role, 'SERVICE_ADVISOR'::app_role]));

  -- Goods receipts policies
  DROP POLICY IF EXISTS "Users can view goods receipts in their org" ON goods_receipts;
  DROP POLICY IF EXISTS "Parts staff can manage goods receipts" ON goods_receipts;
  
  CREATE POLICY "Users can view goods receipts in their org" ON goods_receipts
    FOR SELECT USING (org_id = get_user_org_id());
  
  CREATE POLICY "Parts staff can manage goods receipts" ON goods_receipts
    FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role]));

END
$$;