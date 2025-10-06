-- Correct schedule_appointment to cast enum and robustly handle resource_ids
CREATE OR REPLACE FUNCTION public.schedule_appointment(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_id UUID;
  org_id_val UUID;
  location_id_val UUID;
  status_val appointment_status;
  res_ids UUID[];
  allow_double BOOLEAN := false;
BEGIN
  org_id_val := get_user_org_id();
  location_id_val := NULLIF(payload->>'location_id','')::UUID;

  -- Cast status to enum with safe default
  status_val := COALESCE((payload->>'status')::appointment_status, 'SCHEDULED'::appointment_status);

  -- Scheduler settings
  SELECT COALESCE(s.allow_double_booking, false)
  INTO allow_double
  FROM scheduler_settings s
  WHERE s.org_id = org_id_val
    AND (s.location_id = location_id_val OR s.location_id IS NULL)
  ORDER BY s.location_id NULLS LAST
  LIMIT 1;

  -- Normalize resource ids
  IF payload ? 'resource_ids' THEN
    IF jsonb_typeof(payload->'resource_ids') = 'array' THEN
      SELECT ARRAY(SELECT (elem)::uuid FROM jsonb_array_elements_text(payload->'resource_ids') AS elem)
      INTO res_ids;
    ELSE
      res_ids := CASE 
        WHEN COALESCE(payload->>'resource_ids','') = '' THEN NULL
        ELSE string_to_array(payload->>'resource_ids', ',')::uuid[]
      END;
    END IF;
  END IF;

  -- Conflict check
  IF NOT allow_double AND res_ids IS NOT NULL AND array_length(res_ids,1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM appointments a
      JOIN appointment_resources ar ON a.id = ar.appointment_id
      WHERE ar.resource_id = ANY(res_ids)
        AND a.status::text NOT IN ('cancelled', 'no_show')
        AND a.start_time < (payload->>'end_time')::TIMESTAMPTZ
        AND a.end_time > (payload->>'start_time')::TIMESTAMPTZ
    ) THEN
      RAISE EXCEPTION 'Scheduling conflict detected';
    END IF;
  END IF;

  -- Insert appointment
  INSERT INTO appointments (
    org_id, location_id, customer_id, vehicle_id, type_id,
    title, description, start_time, end_time, status, priority,
    source, estimated_minutes, service_advisor, created_by
  ) VALUES (
    org_id_val,
    location_id_val,
    (payload->>'customer_id')::UUID,
    NULLIF(payload->>'vehicle_id','')::UUID,
    NULLIF(payload->>'type_id','')::UUID,
    payload->>'title',
    payload->>'description',
    (payload->>'start_time')::TIMESTAMPTZ,
    (payload->>'end_time')::TIMESTAMPTZ,
    status_val,
    COALESCE(payload->>'priority', 'normal'),
    COALESCE(payload->>'source', 'phone'),
    COALESCE((payload->>'estimated_minutes')::INTEGER, 60),
    NULLIF(payload->>'service_advisor','')::UUID,
    auth.uid()
  ) RETURNING id INTO appointment_id;

  -- Assign resources
  IF res_ids IS NOT NULL AND array_length(res_ids,1) > 0 THEN
    INSERT INTO appointment_resources (org_id, appointment_id, resource_id)
    SELECT org_id_val, appointment_id, unnest(res_ids);
  END IF;

  -- Optional services
  IF payload ? 'services' AND jsonb_typeof(payload->'services') = 'array' THEN
    INSERT INTO appointment_services (org_id, appointment_id, description, estimated_minutes, inventory_item_id, quantity)
    SELECT 
      org_id_val,
      appointment_id,
      service->>'description',
      COALESCE((service->>'estimated_minutes')::INTEGER, 60),
      NULLIF(service->>'inventory_item_id','')::UUID,
      COALESCE((service->>'quantity')::NUMERIC, 1)
    FROM jsonb_array_elements(payload->'services') AS service;
  END IF;

  RETURN appointment_id;
END;
$function$;