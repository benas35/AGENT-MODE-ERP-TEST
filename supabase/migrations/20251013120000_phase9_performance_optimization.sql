-- Phase 9: Performance Optimization indexes
-- Work order relationships
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_workflow_stage_id ON public.work_orders(workflow_stage_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_location_stage_created ON public.work_orders(location_id, workflow_stage_id, created_at);

-- Appointment scheduling
CREATE INDEX IF NOT EXISTS idx_appointments_start_end ON public.appointments(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_appointments_org_start ON public.appointments(org_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_technician_id ON public.appointments(technician_id);
