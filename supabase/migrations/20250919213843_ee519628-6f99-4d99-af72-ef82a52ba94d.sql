-- Create RPC functions for planner business logic

-- Function to find available time slots
CREATE OR REPLACE FUNCTION public.find_available_slots(
  p_location_id UUID,
  p_resource_type TEXT,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_constraints JSONB DEFAULT '{}'
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  available_resources UUID[],
  score INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_settings RECORD;
  slot_interval INTERVAL;
  current_slot TIMESTAMPTZ;
  resource_ids UUID[];
BEGIN
  -- Get scheduler settings
  SELECT * INTO r_settings
  FROM scheduler_settings s
  WHERE s.org_id = get_user_org_id()
    AND (s.location_id = p_location_id OR s.location_id IS NULL)
  ORDER BY s.location_id NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No scheduler settings found';
  END IF;

  slot_interval := (r_settings.slot_minutes || ' minutes')::INTERVAL;
  
  -- Get available resources of the requested type
  SELECT ARRAY_AGG(r.id) INTO resource_ids
  FROM resources r
  WHERE r.org_id = get_user_org_id()
    AND (r.location_id = p_location_id OR r.location_id IS NULL)
    AND r.type = p_resource_type
    AND r.active = true;

  -- Generate time slots
  current_slot := DATE_TRUNC('hour', p_from_ts) + 
    (EXTRACT(MINUTE FROM p_from_ts)::INTEGER / r_settings.slot_minutes * r_settings.slot_minutes || ' minutes')::INTERVAL;

  WHILE current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= p_to_ts LOOP
    DECLARE
      available_res UUID[];
      slot_score INTEGER := 0;
      weekday_num INTEGER;
      day_start_ts TIMESTAMPTZ;
      day_end_ts TIMESTAMPTZ;
    BEGIN
      weekday_num := EXTRACT(DOW FROM current_slot);
      day_start_ts := DATE_TRUNC('day', current_slot) + r_settings.day_start;
      day_end_ts := DATE_TRUNC('day', current_slot) + r_settings.day_end;

      -- Check if slot is within business hours
      IF current_slot >= day_start_ts AND current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= day_end_ts THEN
        
        -- Find available resources for this slot
        SELECT ARRAY_AGG(r.id) INTO available_res
        FROM resources r
        WHERE r.id = ANY(resource_ids)
          -- Check resource availability for this weekday
          AND EXISTS (
            SELECT 1 FROM resource_availability ra
            WHERE ra.resource_id = r.id
              AND ra.weekday = weekday_num
              AND ra.start_time <= current_slot::TIME
              AND ra.end_time >= (current_slot + (p_duration_minutes || ' minutes')::INTERVAL)::TIME
          )
          -- Check no time off conflicts
          AND NOT EXISTS (
            SELECT 1 FROM resource_time_off rto
            WHERE rto.resource_id = r.id
              AND rto.start_time <= current_slot + (p_duration_minutes || ' minutes')::INTERVAL
              AND rto.end_time >= current_slot
          )
          -- Check no appointment conflicts (unless double booking allowed)
          AND (r_settings.allow_double_booking OR NOT EXISTS (
            SELECT 1 FROM appointments a
            JOIN appointment_resources ar ON a.id = ar.appointment_id
            WHERE ar.resource_id = r.id
              AND a.status NOT IN ('cancelled', 'no_show')
              AND a.start_time < current_slot + (p_duration_minutes || ' minutes')::INTERVAL
              AND a.end_time > current_slot
          ));

        -- Calculate score based on available resources
        IF available_res IS NOT NULL AND array_length(available_res, 1) > 0 THEN
          slot_score := array_length(available_res, 1) * 10;
          
          -- Return the slot
          slot_start := current_slot;
          slot_end := current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
          available_resources := available_res;
          score := slot_score;
          RETURN NEXT;
        END IF;
      END IF;
      
      current_slot := current_slot + slot_interval;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to schedule an appointment
CREATE OR REPLACE FUNCTION public.schedule_appointment(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appointment_id UUID;
  org_id_val UUID;
  location_id_val UUID;
BEGIN
  org_id_val := get_user_org_id();
  location_id_val := (payload->>'location_id')::UUID;

  -- Check conflicts if not allowing double booking
  IF NOT COALESCE((
    SELECT s.allow_double_booking 
    FROM scheduler_settings s 
    WHERE s.org_id = org_id_val 
      AND (s.location_id = location_id_val OR s.location_id IS NULL)
    ORDER BY s.location_id NULLS LAST 
    LIMIT 1
  ), false) THEN
    
    IF EXISTS (
      SELECT 1 FROM appointments a
      JOIN appointment_resources ar ON a.id = ar.appointment_id
      WHERE ar.resource_id = ANY(string_to_array(payload->>'resource_ids', ',')::UUID[])
        AND a.status NOT IN ('cancelled', 'no_show')
        AND a.start_time < (payload->>'end_time')::TIMESTAMPTZ
        AND a.end_time > (payload->>'start_time')::TIMESTAMPTZ
    ) THEN
      RAISE EXCEPTION 'Scheduling conflict detected';
    END IF;
  END IF;

  -- Create the appointment
  INSERT INTO appointments (
    org_id, location_id, customer_id, vehicle_id, type_id,
    title, description, start_time, end_time, status, priority,
    source, estimated_minutes, service_advisor, created_by
  ) VALUES (
    org_id_val,
    location_id_val,
    (payload->>'customer_id')::UUID,
    (payload->>'vehicle_id')::UUID,
    (payload->>'type_id')::UUID,
    payload->>'title',
    payload->>'description',
    (payload->>'start_time')::TIMESTAMPTZ,
    (payload->>'end_time')::TIMESTAMPTZ,
    COALESCE(payload->>'status', 'tentative'),
    COALESCE(payload->>'priority', 'normal'),
    COALESCE(payload->>'source', 'phone'),
    COALESCE((payload->>'estimated_minutes')::INTEGER, 60),
    (payload->>'service_advisor')::UUID,
    auth.uid()
  ) RETURNING id INTO appointment_id;

  -- Assign resources
  IF payload ? 'resource_ids' THEN
    INSERT INTO appointment_resources (org_id, appointment_id, resource_id)
    SELECT org_id_val, appointment_id, unnest(string_to_array(payload->>'resource_ids', ',')::UUID[]);
  END IF;

  -- Add services if provided
  IF payload ? 'services' THEN
    INSERT INTO appointment_services (org_id, appointment_id, description, estimated_minutes, inventory_item_id, quantity)
    SELECT 
      org_id_val,
      appointment_id,
      service->>'description',
      COALESCE((service->>'estimated_minutes')::INTEGER, 60),
      (service->>'inventory_item_id')::UUID,
      COALESCE((service->>'quantity')::NUMERIC, 1)
    FROM jsonb_array_elements(payload->'services') AS service;
  END IF;

  RETURN appointment_id;
END;
$$;

-- Function to reschedule an appointment
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id UUID,
  p_new_start TIMESTAMPTZ,
  p_new_end TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id_val UUID := get_user_org_id();
BEGIN
  -- Check if appointment exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM appointments 
    WHERE id = p_appointment_id AND org_id = org_id_val
  ) THEN
    RAISE EXCEPTION 'Appointment not found or access denied';
  END IF;

  -- Check for conflicts with assigned resources
  IF EXISTS (
    SELECT 1 FROM appointments a
    JOIN appointment_resources ar1 ON a.id = ar1.appointment_id
    JOIN appointment_resources ar2 ON ar1.resource_id = ar2.resource_id
    WHERE ar2.appointment_id = p_appointment_id
      AND a.id != p_appointment_id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND a.start_time < p_new_end
      AND a.end_time > p_new_start
  ) THEN
    RAISE EXCEPTION 'Scheduling conflict with existing appointments';
  END IF;

  -- Update appointment
  UPDATE appointments
  SET start_time = p_new_start,
      end_time = p_new_end,
      updated_at = now()
  WHERE id = p_appointment_id AND org_id = org_id_val;

  -- Log the change in audit_log
  INSERT INTO audit_log (org_id, entity_type, entity_id, action, user_id, new_values)
  VALUES (
    org_id_val,
    'appointment',
    p_appointment_id,
    'reschedule',
    auth.uid(),
    jsonb_build_object('new_start', p_new_start, 'new_end', p_new_end)
  );

  RETURN true;
END;
$$;

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION public.check_appointment_conflicts(p_appointment_id UUID)
RETURNS TABLE (
  conflict_appointment_id UUID,
  conflict_title TEXT,
  resource_name TEXT,
  overlap_start TIMESTAMPTZ,
  overlap_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a2.id,
    a2.title,
    r.name,
    GREATEST(a1.start_time, a2.start_time) as overlap_start,
    LEAST(a1.end_time, a2.end_time) as overlap_end
  FROM appointments a1
  JOIN appointment_resources ar1 ON a1.id = ar1.appointment_id
  JOIN appointment_resources ar2 ON ar1.resource_id = ar2.resource_id
  JOIN appointments a2 ON ar2.appointment_id = a2.id
  JOIN resources r ON ar1.resource_id = r.id
  WHERE a1.id = p_appointment_id
    AND a2.id != p_appointment_id
    AND a1.org_id = get_user_org_id()
    AND a2.org_id = get_user_org_id()
    AND a2.status NOT IN ('cancelled', 'no_show')
    AND a1.start_time < a2.end_time
    AND a1.end_time > a2.start_time;
END;
$$;

-- Function to create work order from appointment
CREATE OR REPLACE FUNCTION public.create_work_order_from_appointment(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  work_order_id UUID;
  appointment_rec RECORD;
  org_id_val UUID := get_user_org_id();
  wo_number TEXT;
BEGIN
  -- Get appointment details
  SELECT * INTO appointment_rec
  FROM appointments
  WHERE id = p_appointment_id AND org_id = org_id_val;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or access denied';
  END IF;

  -- Generate work order number
  SELECT generate_next_number('work_order', org_id_val, appointment_rec.location_id) INTO wo_number;

  -- Create work order
  INSERT INTO work_orders (
    org_id, location_id, customer_id, vehicle_id,
    work_order_number, title, description, status,
    service_advisor, technician_id, created_by
  )
  SELECT 
    org_id_val,
    appointment_rec.location_id,
    appointment_rec.customer_id,
    appointment_rec.vehicle_id,
    wo_number,
    COALESCE(appointment_rec.title, 'Work Order from Appointment'),
    appointment_rec.description,
    'DRAFT',
    appointment_rec.service_advisor,
    (SELECT ar.resource_id 
     FROM appointment_resources ar 
     JOIN resources r ON ar.resource_id = r.id 
     WHERE ar.appointment_id = p_appointment_id AND r.type = 'TECHNICIAN' 
     LIMIT 1),
    auth.uid()
  RETURNING id INTO work_order_id;

  -- Copy appointment services to work order items
  INSERT INTO work_order_items (
    org_id, work_order_id, type, description, 
    inventory_item_id, quantity, sort_order
  )
  SELECT 
    org_id_val,
    work_order_id,
    'SERVICE',
    aps.description,
    aps.inventory_item_id,
    aps.quantity,
    aps.sort_order
  FROM appointment_services aps
  WHERE aps.appointment_id = p_appointment_id;

  -- Update appointment status
  UPDATE appointments
  SET status = 'in_service',
      work_order_id = work_order_id,
      updated_at = now()
  WHERE id = p_appointment_id;

  RETURN work_order_id;
END;
$$;

-- Function to cancel appointment
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id_val UUID := get_user_org_id();
BEGIN
  -- Check if appointment exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM appointments 
    WHERE id = p_appointment_id AND org_id = org_id_val
  ) THEN
    RAISE EXCEPTION 'Appointment not found or access denied';
  END IF;

  -- Update appointment status
  UPDATE appointments
  SET status = 'cancelled',
      notes = COALESCE(notes || E'\n\nCancellation reason: ' || p_reason, 'Cancelled: ' || COALESCE(p_reason, 'No reason provided')),
      updated_at = now()
  WHERE id = p_appointment_id AND org_id = org_id_val;

  -- Log the cancellation
  INSERT INTO audit_log (org_id, entity_type, entity_id, action, user_id, new_values)
  VALUES (
    org_id_val,
    'appointment',
    p_appointment_id,
    'cancel',
    auth.uid(),
    jsonb_build_object('reason', p_reason)
  );

  RETURN true;
END;
$$;