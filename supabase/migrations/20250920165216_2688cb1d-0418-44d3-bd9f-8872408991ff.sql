-- Add missing fields to work_orders table for enhanced workflow cards
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0, 
ADD COLUMN IF NOT EXISTS total_estimate NUMERIC DEFAULT 0;