-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE app_role AS ENUM ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'PARTS_MANAGER', 'FRONT_DESK', 'VIEWER');
CREATE TYPE work_order_status AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE estimate_status AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'EXPIRED', 'CONVERTED');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'STRIPE', 'OTHER');
CREATE TYPE item_type AS ENUM ('LABOR', 'PART', 'FEE', 'DISCOUNT');
CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- Organizations table (multi-tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    currency TEXT DEFAULT 'EUR',
    locale TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    logo_url TEXT,
    address JSONB,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations within organizations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address JSONB,
    hours JSONB,
    is_default BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, slug)
);

-- User profiles extending auth.users
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    role app_role NOT NULL DEFAULT 'VIEWER',
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    locale TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    customer_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    address JSONB,
    notes TEXT,
    gdpr_consent BOOLEAN DEFAULT false,
    marketing_consent_email BOOLEAN DEFAULT false,
    marketing_consent_sms BOOLEAN DEFAULT false,
    tax_exempt BOOLEAN DEFAULT false,
    credit_limit NUMERIC(10,2) DEFAULT 0,
    balance NUMERIC(10,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vin TEXT,
    license_plate TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    mileage INTEGER DEFAULT 0,
    engine TEXT,
    transmission TEXT,
    fuel_type TEXT,
    tire_size TEXT,
    notes TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address JSONB,
    tax_number TEXT,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    brand TEXT,
    unit TEXT DEFAULT 'ea',
    bin_location TEXT,
    cost NUMERIC(10,2) DEFAULT 0,
    price NUMERIC(10,2) DEFAULT 0,
    quantity_on_hand NUMERIC(10,2) DEFAULT 0,
    quantity_allocated NUMERIC(10,2) DEFAULT 0,
    quantity_available NUMERIC(10,2) GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    reorder_point NUMERIC(10,2) DEFAULT 0,
    reorder_quantity NUMERIC(10,2) DEFAULT 0,
    markup_percentage NUMERIC(5,2) DEFAULT 0,
    tax_code TEXT,
    vendor_id UUID REFERENCES vendors(id),
    vendor_part_number TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, sku)
);

-- Estimates
CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    estimate_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    status estimate_status DEFAULT 'DRAFT',
    title TEXT,
    description TEXT,
    notes TEXT,
    internal_notes TEXT,
    expires_at DATE,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, estimate_number)
);

-- Work orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    work_order_number TEXT NOT NULL,
    estimate_id UUID REFERENCES estimates(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    status work_order_status DEFAULT 'DRAFT',
    priority TEXT DEFAULT 'normal',
    title TEXT,
    description TEXT,
    complaint TEXT,
    cause TEXT,
    correction TEXT,
    notes TEXT,
    internal_notes TEXT,
    service_advisor UUID REFERENCES auth.users(id),
    technician_id UUID REFERENCES auth.users(id),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    promised_at TIMESTAMPTZ,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    labor_hours_estimated NUMERIC(5,2) DEFAULT 0,
    labor_hours_actual NUMERIC(5,2) DEFAULT 0,
    mileage_in INTEGER,
    mileage_out INTEGER,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, work_order_number)
);

-- Estimate line items
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    type item_type NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    unit_price NUMERIC(10,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    taxable BOOLEAN DEFAULT true,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work order line items
CREATE TABLE work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    technician_id UUID REFERENCES auth.users(id),
    type item_type NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    quantity_used NUMERIC(10,2) DEFAULT 0,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    unit_price NUMERIC(10,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    taxable BOOLEAN DEFAULT true,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    invoice_number TEXT NOT NULL,
    work_order_id UUID REFERENCES work_orders(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    status invoice_status DEFAULT 'DRAFT',
    issued_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    terms TEXT,
    notes TEXT,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    balance_due NUMERIC(10,2) DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, invoice_number)
);

-- Invoice line items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    work_order_item_id UUID REFERENCES work_order_items(id),
    type item_type NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    taxable BOOLEAN DEFAULT true,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount NUMERIC(10,2) NOT NULL,
    method payment_method NOT NULL,
    reference TEXT,
    notes TEXT,
    processor_id TEXT,
    processor_response JSONB,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    po_number TEXT NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    status TEXT DEFAULT 'DRAFT',
    ordered_at TIMESTAMPTZ,
    expected_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, po_number)
);

-- Purchase order items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    quantity_ordered NUMERIC(10,2) NOT NULL,
    quantity_received NUMERIC(10,2) DEFAULT 0,
    unit_cost NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements for inventory tracking
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    movement_type TEXT NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
    quantity_change NUMERIC(10,2) NOT NULL,
    unit_cost NUMERIC(10,2),
    reference_type TEXT, -- 'purchase_order', 'work_order', 'adjustment'
    reference_id UUID,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time tracking for technicians
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    work_order_id UUID REFERENCES work_orders(id),
    work_order_item_id UUID REFERENCES work_order_items(id),
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN clock_out IS NOT NULL 
            THEN EXTRACT(EPOCH FROM clock_out - clock_in) / 60
            ELSE NULL
        END
    ) STORED,
    billable BOOLEAN DEFAULT true,
    hourly_rate NUMERIC(8,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments and scheduling
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    work_order_id UUID REFERENCES work_orders(id),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'SCHEDULED',
    assigned_to UUID REFERENCES auth.users(id),
    bay TEXT,
    notes TEXT,
    reminder_sent_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT, -- 'photo', 'document', 'signature'
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service reminders
CREATE TABLE service_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    service_type TEXT NOT NULL,
    due_date DATE,
    due_mileage INTEGER,
    interval_months INTEGER,
    interval_miles INTEGER,
    description TEXT,
    notes TEXT,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for tracking changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Numbering sequences
CREATE TABLE number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    entity_type TEXT NOT NULL,
    prefix TEXT DEFAULT '',
    current_number INTEGER DEFAULT 0,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, location_id, entity_type, year)
);

-- Feature flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, key)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_customers_org_id ON customers(org_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_vehicles_org_id ON vehicles(org_id);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_work_orders_org_id ON work_orders(org_id);
CREATE INDEX idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_technician_id ON work_orders(technician_id);
CREATE INDEX idx_inventory_items_org_id ON inventory_items(org_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX idx_estimates_org_id ON estimates(org_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_appointments_org_id ON appointments(org_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);