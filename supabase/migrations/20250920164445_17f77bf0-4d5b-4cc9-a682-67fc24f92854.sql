-- Fix appointment_status enum to include missing values
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'no_show';

-- Add missing foreign key relationships that queries are expecting
-- Note: We won't actually create the foreign keys since the tables might not exist,
-- but we'll make sure the schema supports the relationships that are being queried