-- Sample data to exercise reporting dashboards (safe to run multiple times)
DO $$
DECLARE
  v_org UUID;
  v_location UUID;
  v_profile UUID := '00000000-0000-0000-0000-00000000feed';
  v_customer UUID;
  v_vehicle UUID;
  v_work_order UUID;
  v_invoice UUID;
  v_tech UUID;
  v_bay UUID;
  v_appointment UUID;
BEGIN
  SELECT id INTO v_org FROM organizations ORDER BY created_at DESC LIMIT 1;
  IF v_org IS NULL THEN
    RAISE NOTICE 'No organizations found, skipping reporting seed';
    RETURN;
  END IF;

  SELECT id INTO v_location FROM locations WHERE org_id = v_org LIMIT 1;

  -- Ensure a profile exists for created_by references
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_profile) THEN
    INSERT INTO profiles (id, org_id, first_name, last_name, email, role, active)
    VALUES (v_profile, v_org, 'Reporting', 'Seed', 'reporting_seed@example.com', 'MANAGER', true);
  END IF;

  -- Technician and bay resources
  SELECT id INTO v_tech FROM resources WHERE org_id = v_org AND type = 'TECHNICIAN' LIMIT 1;
  IF v_tech IS NULL THEN
    INSERT INTO resources (org_id, location_id, type, name)
    VALUES (v_org, v_location, 'TECHNICIAN', 'Reporting Tech')
    RETURNING id INTO v_tech;
  END IF;

  SELECT id INTO v_bay FROM resources WHERE org_id = v_org AND type = 'BAY' LIMIT 1;
  IF v_bay IS NULL THEN
    INSERT INTO resources (org_id, location_id, type, name)
    VALUES (v_org, v_location, 'BAY', 'Bay Alpha')
    RETURNING id INTO v_bay;
  END IF;

  -- Customer and vehicle
  SELECT id INTO v_customer FROM customers WHERE email = 'reporting.customer@example.com' LIMIT 1;
  IF v_customer IS NULL THEN
    INSERT INTO customers (org_id, first_name, last_name, email, phone, created_by)
    VALUES (v_org, 'Reporting', 'Customer', 'reporting.customer@example.com', '+15555555555', v_profile)
    RETURNING id INTO v_customer;
  END IF;

  SELECT id INTO v_vehicle FROM vehicles WHERE org_id = v_org AND vin = 'REPORTINGVIN0001' LIMIT 1;
  IF v_vehicle IS NULL THEN
    INSERT INTO vehicles (org_id, customer_id, make, model, year, vin, license_plate)
    VALUES (v_org, v_customer, 'Lovable', 'Test Coupe', 2023, 'REPORTINGVIN0001', 'RPT-001')
    RETURNING id INTO v_vehicle;
  END IF;

  -- Work order with items
  SELECT id INTO v_work_order FROM work_orders WHERE work_order_number = 'RPT-001' LIMIT 1;
  IF v_work_order IS NULL THEN
    INSERT INTO work_orders (
      org_id, location_id, customer_id, vehicle_id, created_by, work_order_number,
      title, description, status, technician_id, estimated_hours, labor_hours_estimated,
      total, subtotal, tax_amount, started_at, completed_at
    ) VALUES (
      v_org, v_location, v_customer, v_vehicle, v_profile, 'RPT-001',
      'Reporting Seed', 'Seed work order for reporting dashboards', 'COMPLETED', v_tech,
      3, 3, 820, 700, 120, now() - INTERVAL '2 days', now() - INTERVAL '1 day'
    ) RETURNING id INTO v_work_order;

    INSERT INTO work_order_items (org_id, work_order_id, type, description, quantity, unit_price, line_total)
    VALUES
      (v_org, v_work_order, 'LABOR', 'Brake Job', 2, 150, 300),
      (v_org, v_work_order, 'PART', 'Brake Pads', 1, 200, 200),
      (v_org, v_work_order, 'FEE', 'Shop Supplies', 1, 50, 50),
      (v_org, v_work_order, 'PART', 'Rotor Set', 1, 250, 250)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Invoice tied to work order
  SELECT id INTO v_invoice FROM invoices WHERE work_order_id = v_work_order LIMIT 1;
  IF v_invoice IS NULL THEN
    INSERT INTO invoices (org_id, customer_id, work_order_id, vehicle_id, created_by, invoice_number, total, subtotal, tax_amount, issued_at, status, location_id)
    VALUES (v_org, v_customer, v_work_order, v_vehicle, v_profile, 'INV-RPT-001', 820, 700, 120, now() - INTERVAL '1 day', 'SENT', v_location)
    RETURNING id INTO v_invoice;
  END IF;

  -- Appointment + resource
  SELECT id INTO v_appointment FROM appointments WHERE title = 'Reporting Seed Appointment' LIMIT 1;
  IF v_appointment IS NULL THEN
    INSERT INTO appointments (org_id, title, customer_id, vehicle_id, technician_id, bay_id, status, starts_at, ends_at, notes, priority, created_by, location_id)
    VALUES (
      v_org, 'Reporting Seed Appointment', v_customer, v_vehicle, v_tech, NULL, 'completed',
      now() + INTERVAL '1 day', now() + INTERVAL '1 day' + INTERVAL '2 hours',
      'Seed appointment for analytics coverage', 1, v_profile, v_location
    ) RETURNING id INTO v_appointment;

    INSERT INTO appointment_resources (org_id, appointment_id, resource_id)
    VALUES (v_org, v_appointment, v_bay)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
