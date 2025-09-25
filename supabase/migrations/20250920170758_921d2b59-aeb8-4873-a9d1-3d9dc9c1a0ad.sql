-- Add missing RLS policies for remaining tables
CREATE POLICY "Users can view bins in their org" ON bins
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can view supplier invoices in their org" ON supplier_invoices
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Users can view goods receipt lines in their org" ON goods_receipt_lines
  FOR SELECT USING (org_id = get_user_org_id());