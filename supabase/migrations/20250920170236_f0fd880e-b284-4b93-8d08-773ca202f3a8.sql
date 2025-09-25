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
  cost_method text NOT NULL DEFAULT 'average', -- average|fifo
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

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
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

-- Create purchase_orders table (extend existing)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS fx_rate numeric(12,6) DEFAULT 1,
ADD COLUMN IF NOT EXISTS expected_at date,
ADD COLUMN IF NOT EXISTS freight numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_total numeric(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total numeric(14,2) DEFAULT 0;

-- Create purchase_order_lines table (extend existing purchase_order_items)
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS part_id uuid REFERENCES parts(id),
ADD COLUMN IF NOT EXISTS qty_ordered numeric(12,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_received numeric(12,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uom text DEFAULT 'ea',
ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount numeric(14,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id),
ADD COLUMN IF NOT EXISTS bin_id uuid REFERENCES bins(id),
ADD COLUMN IF NOT EXISTS expected_at date;

-- Create goods_receipts table
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  supplier_id uuid REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  number text NOT NULL,
  status text DEFAULT 'draft', -- draft|posted|cancelled
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
  status text DEFAULT 'open', -- open|matched|exported|paid
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_invoice_lines table
CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  supplier_invoice_id uuid NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  goods_receipt_line_id uuid REFERENCES goods_receipt_lines(id),
  part_id uuid REFERENCES parts(id),
  description text,
  qty numeric(12,3) NOT NULL,
  uom text DEFAULT 'ea',
  unit_cost numeric(14,4) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0,
  line_total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create stock_ledger table
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  part_id uuid NOT NULL REFERENCES parts(id),
  warehouse_id uuid REFERENCES warehouses(id),
  bin_id uuid REFERENCES bins(id),
  txn_type text NOT NULL, -- PO_RECEIPT|RETURN_TO_SUPPLIER|SALE|ADJUSTMENT|TRANSFER_OUT|TRANSFER_IN|COUNT|OPENING
  qty_delta numeric(14,3) NOT NULL,
  unit_cost numeric(14,6) NOT NULL,
  value_delta numeric(16,4) NOT NULL,
  ref_type text NOT NULL, -- GRN|PO|INVOICE|ADJUSTMENT|TRANSFER
  ref_id uuid,
  ref_line_id uuid,
  lot_no text,
  serial_no text,
  occurred_at timestamptz DEFAULT now(),
  created_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create inventory_balances materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_balances AS
SELECT 
  org_id, 
  location_id, 
  part_id, 
  warehouse_id,
  SUM(qty_delta) as qty_on_hand,
  CASE 
    WHEN SUM(qty_delta) = 0 THEN 0 
    ELSE SUM(value_delta) / NULLIF(SUM(qty_delta), 0) 
  END as avg_cost,
  SUM(value_delta) as total_value
FROM stock_ledger
GROUP BY org_id, location_id, part_id, warehouse_id;

-- Create stock_adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  location_id uuid REFERENCES locations(id),
  warehouse_id uuid REFERENCES warehouses(id),
  number text NOT NULL,
  adjustment_date date DEFAULT CURRENT_DATE,
  reason_code text NOT NULL, -- write_off|found_stock|damage|cycle_count|opening_balance
  reason text,
  status text DEFAULT 'draft', -- draft|posted|cancelled
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stock_adjustment_lines table
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  stock_adjustment_id uuid NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  bin_id uuid REFERENCES bins(id),
  qty_counted numeric(12,3),
  qty_system numeric(12,3),
  qty_variance numeric(12,3),
  unit_cost numeric(14,4),
  value_variance numeric(16,4),
  lot_no text,
  serial_no text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_org_sku ON parts(org_id, sku);
CREATE INDEX IF NOT EXISTS idx_parts_org_part_no ON parts(org_id, part_no);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_org_part ON stock_ledger(org_id, part_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_warehouse_part ON stock_ledger(warehouse_id, part_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_occurred_at ON stock_ledger(occurred_at);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_org_status ON goods_receipts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status ON purchase_orders(org_id, status);

-- Enable RLS
ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for part_categories
CREATE POLICY "Users can view part categories in their org" ON part_categories
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage part categories" ON part_categories
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for parts
CREATE POLICY "Users can view parts in their org" ON parts
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage parts" ON parts
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for suppliers
CREATE POLICY "Users can view suppliers in their org" ON suppliers
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage suppliers" ON suppliers
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for warehouses
CREATE POLICY "Users can view warehouses in their org" ON warehouses
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage warehouses" ON warehouses
  FOR ALL USING (org_id = get_user_org_id() AND is_admin());

-- Create RLS policies for bins
CREATE POLICY "Users can view bins in their org" ON bins
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage bins" ON bins
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for goods receipts
CREATE POLICY "Users can view goods receipts in their org" ON goods_receipts
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts staff can manage goods receipts" ON goods_receipts
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role]));

-- Create RLS policies for goods receipt lines
CREATE POLICY "Users can view goods receipt lines in their org" ON goods_receipt_lines
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts staff can manage goods receipt lines" ON goods_receipt_lines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role]));

-- Create RLS policies for supplier invoices
CREATE POLICY "Users can view supplier invoices in their org" ON supplier_invoices
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage supplier invoices" ON supplier_invoices
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for supplier invoice lines
CREATE POLICY "Users can view supplier invoice lines in their org" ON supplier_invoice_lines
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers can manage supplier invoice lines" ON supplier_invoice_lines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for stock ledger
CREATE POLICY "Users can view stock ledger in their org" ON stock_ledger
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts staff can insert stock ledger entries" ON stock_ledger
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role, 'TECHNICIAN'::app_role, 'SERVICE_ADVISOR'::app_role]));

-- Create RLS policies for stock adjustments
CREATE POLICY "Users can view stock adjustments in their org" ON stock_adjustments
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage stock adjustments" ON stock_adjustments
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Create RLS policies for stock adjustment lines
CREATE POLICY "Users can view stock adjustment lines in their org" ON stock_adjustment_lines
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Parts managers can manage stock adjustment lines" ON stock_adjustment_lines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = ANY(ARRAY['OWNER'::app_role, 'MANAGER'::app_role, 'PARTS_MANAGER'::app_role]));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_part_categories_updated_at BEFORE UPDATE ON part_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON goods_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_invoices_updated_at BEFORE UPDATE ON supplier_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_adjustments_updated_at BEFORE UPDATE ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();