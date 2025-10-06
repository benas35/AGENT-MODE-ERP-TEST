-- Phase 1.1 & 1.2: Vehicle and Work Order Photo Infrastructure (Fixed)

-- First, create the work_order_media table
CREATE TABLE IF NOT EXISTS work_order_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('before', 'during', 'after', 'damage', 'repair', 'other')),
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, storage_path)
);

-- Enable RLS on work_order_media
ALTER TABLE work_order_media ENABLE ROW LEVEL SECURITY;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_order_media_work_order ON work_order_media(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_media_org ON work_order_media(org_id);

-- Now create storage bucket for work order photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'work-order-photos',
  'work-order-photos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Enhanced RLS policies for vehicles bucket
DROP POLICY IF EXISTS "Users can view vehicle photos in their org" ON storage.objects;
CREATE POLICY "Users can view vehicle photos in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicles' 
  AND (
    (SELECT public FROM storage.buckets WHERE id = 'vehicles')
    OR
    EXISTS (
      SELECT 1 FROM vehicle_media vm
      JOIN vehicles v ON vm.vehicle_id = v.id
      WHERE vm.storage_path = storage.objects.name
      AND v.org_id = get_user_org_id()
    )
  )
);

DROP POLICY IF EXISTS "Service staff can upload vehicle photos" ON storage.objects;
CREATE POLICY "Service staff can upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicles'
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK', 'TECHNICIAN')
);

DROP POLICY IF EXISTS "Service staff can delete vehicle photos" ON storage.objects;
CREATE POLICY "Service staff can delete vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicles'
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'FRONT_DESK')
);

-- RLS policies for work order photos bucket
CREATE POLICY "Users can view work order photos in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-photos'
  AND EXISTS (
    SELECT 1 FROM work_order_media wom
    JOIN work_orders wo ON wom.work_order_id = wo.id
    WHERE wom.storage_path = storage.objects.name
    AND wo.org_id = get_user_org_id()
  )
);

CREATE POLICY "Service staff can upload work order photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-photos'
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
);

CREATE POLICY "Service staff can delete work order photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-photos'
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
);

-- RLS policies for work_order_media table
CREATE POLICY "Users can view work order media in their org"
ON work_order_media FOR SELECT
TO authenticated
USING (org_id = get_user_org_id());

CREATE POLICY "Service staff can insert work order media"
ON work_order_media FOR INSERT
TO authenticated
WITH CHECK (
  org_id = get_user_org_id()
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
);

CREATE POLICY "Service staff can delete work order media"
ON work_order_media FOR DELETE
TO authenticated
USING (
  org_id = get_user_org_id()
  AND get_user_role() IN ('OWNER', 'MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN')
);

-- Notification trigger for new work order photos
CREATE OR REPLACE FUNCTION notify_customer_of_work_order_photo()
RETURNS TRIGGER AS $$
DECLARE
  customer_id_var UUID;
  work_order_number_var TEXT;
BEGIN
  SELECT wo.customer_id, wo.work_order_number
  INTO customer_id_var, work_order_number_var
  FROM work_orders wo
  WHERE wo.id = NEW.work_order_id;

  IF customer_id_var IS NOT NULL THEN
    INSERT INTO notifications (
      org_id,
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.org_id,
      NULL,
      'work_order_photo',
      'New Photo Added to Work Order',
      'A technician has uploaded a new photo to work order ' || work_order_number_var,
      jsonb_build_object(
        'work_order_id', NEW.work_order_id,
        'work_order_number', work_order_number_var,
        'photo_id', NEW.id,
        'photo_kind', NEW.kind,
        'customer_id', customer_id_var
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_customer_of_work_order_photo
AFTER INSERT ON work_order_media
FOR EACH ROW
EXECUTE FUNCTION notify_customer_of_work_order_photo();