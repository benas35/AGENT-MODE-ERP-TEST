-- Insert seed data for development and testing

-- Create a demo organization
INSERT INTO organizations (id, name, slug, currency, locale, timezone, phone, email, address) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000',
  'ProFix Auto Services',
  'profix-auto',
  'EUR',
  'en',
  'Europe/Vilnius',
  '+370 5 123 4567',
  'info@profix-auto.com',
  '{"street": "Gedimino pr. 1", "city": "Vilnius", "postalCode": "01103", "country": "Lithuania"}'::jsonb
);

-- Create locations for the organization
INSERT INTO locations (id, org_id, name, slug, phone, email, address, hours, is_default, active) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Main Location',
  'main',
  '+370 5 123 4567',
  'main@profix-auto.com',
  '{"street": "Gedimino pr. 1", "city": "Vilnius", "postalCode": "01103", "country": "Lithuania"}'::jsonb,
  '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "15:00"}, "sunday": {"closed": true}}'::jsonb,
  true,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  'Service Center 2',
  'center-2',
  '+370 5 234 5678',
  'center2@profix-auto.com',
  '{"street": "Konstitucijos pr. 15", "city": "Vilnius", "postalCode": "09308", "country": "Lithuania"}'::jsonb,
  '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"closed": true}, "sunday": {"closed": true}}'::jsonb,
  false,
  true
);

-- Create demo customers
INSERT INTO customers (id, org_id, location_id, customer_number, first_name, last_name, email, phone, mobile, address, notes, gdpr_consent, marketing_consent_email) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'CUST-2025-0001', 'Jonas', 'Jonaitis', 'jonas.jonaitis@email.com', '+370 612 34567', '+370 612 34567', '{"street": "Pylimo g. 10", "city": "Vilnius", "postalCode": "01141", "country": "Lithuania"}'::jsonb, 'Regular customer, prefers appointments in the morning', true, true),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'CUST-2025-0002', 'Petras', 'Petraitis', 'petras.petraitis@email.com', '+370 623 45678', '+370 623 45678', '{"street": "Vokiečių g. 5", "city": "Vilnius", "postalCode": "01130", "country": "Lithuania"}'::jsonb, 'Fleet customer with multiple vehicles', true, false),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'CUST-2025-0003', 'Ona', 'Onaite', 'ona.onaite@email.com', '+370 634 56789', '+370 634 56789', '{"street": "Antakalnio g. 15", "city": "Vilnius", "postalCode": "10312", "country": "Lithuania"}'::jsonb, 'Prefers original parts only', true, true),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'CUST-2025-0004', 'Antanas', 'Antanaitis', 'antanas.antanaitis@email.com', '+370 645 67890', '+370 645 67890', '{"street": "Žirmūnų g. 20", "city": "Vilnius", "postalCode": "09200", "country": "Lithuania"}'::jsonb, 'New customer', true, true);

-- Create demo vehicles
INSERT INTO vehicles (id, org_id, customer_id, vin, license_plate, make, model, year, color, mileage, engine, transmission, fuel_type, tire_size, notes) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'WVWZZZ1JZ3W386752', 'ABC123', 'Volkswagen', 'Golf', 2019, 'Blue', 45000, '1.4 TSI', 'Manual', 'Petrol', '205/55R16', 'Regular maintenance customer'),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'WVWZZZ1JZ3W386753', 'DEF456', 'Volkswagen', 'Passat', 2020, 'Silver', 35000, '2.0 TDI', 'Automatic', 'Diesel', '215/60R16', 'Company car'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'WBAFR91000LM26509', 'GHI789', 'BMW', '3 Series', 2018, 'Black', 67000, '2.0i', 'Automatic', 'Petrol', '225/50R17', 'Requires premium parts'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440011', 'WDC1668451A123456', 'JKL012', 'Mercedes-Benz', 'C-Class', 2021, 'White', 23000, '2.0 CGI', 'Automatic', 'Petrol', '205/55R16', 'Under warranty'),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440012', 'WVWZZZ16Z8P123456', 'MNO345', 'Volkswagen', 'Touran', 2017, 'Red', 89000, '1.6 TDI', 'Manual', 'Diesel', '215/60R16', 'Family car, 7-seater'),
('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440013', 'JTDKN3DP8A0123456', 'PQR678', 'Toyota', 'Avensis', 2016, 'Gray', 112000, '2.0 D-4D', 'Manual', 'Diesel', '215/60R16', 'High mileage, regular service');

-- Create demo vendors
INSERT INTO vendors (id, org_id, name, contact_name, email, phone, address, payment_terms, notes, active) VALUES
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'Euro Parts Ltd', 'Martynas Kazlauskas', 'martynas@europarts.lt', '+370 5 456 7890', '{"street": "Savanorių pr. 123", "city": "Vilnius", "postalCode": "03150", "country": "Lithuania"}'::jsonb, 30, 'Main parts supplier, good prices', true),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'Baltic Auto Supply', 'Laura Petraitiene', 'laura@balticsupply.lt', '+370 5 567 8901', '{"street": "Laisvės pr. 45", "city": "Vilnius", "postalCode": "04215", "country": "Lithuania"}'::jsonb, 45, 'Premium parts, original equipment', true),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'Tools & Equipment Co', 'Valdas Rakauskas', 'valdas@toolsequip.lt', '+370 5 678 9012', '{"street": "Ukmergės g. 280", "city": "Vilnius", "postalCode": "06313", "country": "Lithuania"}'::jsonb, 30, 'Tools and workshop equipment', true);

-- Create demo inventory items
INSERT INTO inventory_items (id, org_id, location_id, sku, barcode, name, description, category, brand, unit, bin_location, cost, price, quantity_on_hand, reorder_point, reorder_quantity, markup_percentage, vendor_id, vendor_part_number, active) VALUES
-- Engine Oil
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'OIL-5W30-5L', '1234567890123', 'Engine Oil 5W-30 5L', 'Synthetic engine oil 5W-30, 5 liter container', 'Oils & Fluids', 'Castrol', 'L', 'A1-01', 8.50, 15.99, 24.0, 10.0, 20.0, 88.12, '550e8400-e29b-41d4-a716-446655440030', 'CAST-5W30-5L', true),
-- Oil Filter
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'FILT-OIL-VW', '1234567890124', 'Oil Filter VW/Audi', 'Oil filter compatible with VW/Audi vehicles', 'Filters', 'Mann', 'ea', 'B2-15', 4.20, 12.99, 15.0, 5.0, 25.0, 209.29, '550e8400-e29b-41d4-a716-446655440030', 'MANN-W712/52', true),
-- Air Filter  
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'FILT-AIR-VW', '1234567890125', 'Air Filter VW Golf', 'Air filter for VW Golf 2016-2020', 'Filters', 'Bosch', 'ea', 'B2-20', 6.80, 18.99, 8.0, 3.0, 15.0, 179.26, '550e8400-e29b-41d4-a716-446655440031', 'BOSCH-1457433229', true),
-- Brake Pads
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'BRAKE-PAD-FRONT', '1234567890126', 'Brake Pads Front Set', 'Front brake pads set for VW/Audi', 'Brakes', 'Brembo', 'set', 'C1-05', 45.00, 89.99, 6.0, 2.0, 10.0, 99.98, '550e8400-e29b-41d4-a716-446655440031', 'BREMBO-P85020', true),
-- Spark Plugs
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'SPARK-PLUG-NGK', '1234567890127', 'Spark Plug NGK', 'NGK spark plug for petrol engines', 'Ignition', 'NGK', 'ea', 'D3-10', 8.50, 16.99, 20.0, 8.0, 24.0, 99.88, '550e8400-e29b-41d4-a716-446655440030', 'NGK-BKR6E', true),
-- Coolant
('550e8400-e29b-41d4-a716-446655440045', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'COOLANT-G12', '1234567890128', 'Coolant G12+ 1.5L', 'Original VW/Audi coolant G12+', 'Oils & Fluids', 'Volkswagen', 'L', 'A1-15', 12.00, 24.99, 12.0, 5.0, 15.0, 108.25, '550e8400-e29b-41d4-a716-446655440031', 'VW-G012A8FM1', true);

-- Initialize number sequences for the organization
INSERT INTO number_sequences (org_id, location_id, entity_type, year, current_number) VALUES
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'customer', 2025, 4),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'estimate', 2025, 0),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'work_order', 2025, 0),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'invoice', 2025, 0),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'purchase_order', 2025, 0);

-- Create some feature flags for the organization
INSERT INTO feature_flags (org_id, key, enabled, data) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'enable_sms_notifications', false, '{"provider": "twilio"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440000', 'enable_stripe_payments', true, '{"test_mode": true}'::jsonb),
('550e8400-e29b-41d4-a716-446655440000', 'enable_multi_location', true, '{}'::jsonb),
('550e8400-e29b-41d4-a716-446655440000', 'enable_inventory_tracking', true, '{}'::jsonb);