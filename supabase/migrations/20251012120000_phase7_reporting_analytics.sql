-- Phase 7 Reporting & Analytics

-- Aggregated reporting function returning JSON payloads for the dashboard
CREATE OR REPLACE FUNCTION reporting_overview(
  p_start TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_end TIMESTAMPTZ DEFAULT now(),
  p_period TEXT DEFAULT 'week',
  p_location_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := get_user_org_id();
  v_period TEXT := COALESCE(NULLIF(p_period, ''), 'week');
BEGIN
  IF v_period NOT IN ('day', 'week', 'month') THEN
    v_period := 'week';
  END IF;

  RETURN jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'revenue', COALESCE(SUM(total), 0),
        'workOrders', COUNT(*),
        'avgTicket', COALESCE(AVG(total), 0),
        'customers', COUNT(DISTINCT customer_id)
      )
      FROM work_orders wo
      WHERE wo.org_id = v_org
        AND (p_location_id IS NULL OR wo.location_id = p_location_id)
        AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
    ),
    'salesByPeriod', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.period_start), '[]'::jsonb)
      FROM (
        SELECT
          date_trunc(v_period, COALESCE(wo.completed_at, wo.created_at)) AS period_start,
          COALESCE(SUM(wo.total), 0) AS revenue,
          COUNT(*) AS work_orders
        FROM work_orders wo
        WHERE wo.org_id = v_org
          AND (p_location_id IS NULL OR wo.location_id = p_location_id)
          AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
        GROUP BY 1
      ) t
    ),
    'serviceMix', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC), '[]'::jsonb)
      FROM (
        SELECT
          COALESCE(inv.category, woi.type::text, 'Uncategorized') AS service_type,
          SUM(COALESCE(woi.line_total, COALESCE(woi.unit_price, 0) * COALESCE(woi.quantity, 1))) AS revenue,
          COUNT(*) AS line_items
        FROM work_order_items woi
        JOIN work_orders wo ON wo.id = woi.work_order_id AND wo.org_id = v_org
        LEFT JOIN inventory_items inv ON inv.id = woi.inventory_item_id
        WHERE (p_location_id IS NULL OR wo.location_id = p_location_id)
          AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
        GROUP BY 1
      ) t
    ),
    'salesByTechnician', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC), '[]'::jsonb)
      FROM (
        SELECT
          wo.technician_id,
          r.name AS technician_name,
          COUNT(*) AS work_orders,
          COALESCE(SUM(wo.total), 0) AS revenue,
          COALESCE(SUM(COALESCE(wo.labor_hours_actual, wo.actual_hours, wo.estimated_hours, 0)), 0) AS hours_worked,
          AVG(
            CASE
              WHEN wo.labor_hours_estimated IS NULL OR wo.labor_hours_estimated = 0 THEN NULL
              ELSE wo.labor_hours_actual / wo.labor_hours_estimated
            END
          ) AS efficiency
        FROM work_orders wo
        LEFT JOIN resources r ON r.id = wo.technician_id
        WHERE wo.org_id = v_org
          AND (p_location_id IS NULL OR wo.location_id = p_location_id)
          AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
        GROUP BY wo.technician_id, r.name
      ) t
    ),
    'cycleTimes', jsonb_build_object(
      'avgRepairHours', (
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(wo.completed_at, now()) - wo.started_at)) / 3600), 0)
        FROM work_orders wo
        WHERE wo.org_id = v_org
          AND wo.started_at IS NOT NULL
          AND (p_location_id IS NULL OR wo.location_id = p_location_id)
          AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
      ),
      'avgCycleHours', (
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(wo.completed_at, now()) - wo.created_at)) / 3600), 0)
        FROM work_orders wo
        WHERE wo.org_id = v_org
          AND (p_location_id IS NULL OR wo.location_id = p_location_id)
          AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
      )
    ),
    'bayUtilization', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.booked_hours DESC), '[]'::jsonb)
      FROM (
        WITH bay_hours AS (
          SELECT
            ar.resource_id,
            SUM(EXTRACT(EPOCH FROM (a.ends_at - a.starts_at)) / 3600) AS booked_hours,
            COUNT(*) AS appointments
          FROM appointment_resources ar
          JOIN appointments a ON a.id = ar.appointment_id
          JOIN resources r ON r.id = ar.resource_id AND r.type = 'BAY'
          WHERE a.org_id = v_org
            AND (p_location_id IS NULL OR a.location_id = p_location_id)
            AND a.starts_at BETWEEN p_start AND p_end
          GROUP BY ar.resource_id
        )
        SELECT
          r.id AS bay_id,
          r.name AS bay_name,
          bh.booked_hours,
          bh.appointments,
          ROUND((bh.booked_hours / NULLIF(EXTRACT(EPOCH FROM (p_end - p_start)) / 3600, 0)) * 100, 1) AS utilization_pct
        FROM bay_hours bh
        LEFT JOIN resources r ON r.id = bh.resource_id
      ) t
    ),
    'inventory', jsonb_build_object(
      'stockValue', (
        SELECT COALESCE(SUM(COALESCE(quantity_on_hand, 0) * COALESCE(cost, 0)), 0)
        FROM inventory_items ii
        WHERE ii.org_id = v_org
          AND (p_location_id IS NULL OR ii.location_id = p_location_id)
      ),
      'lowStockCount', (
        SELECT COUNT(*)
        FROM inventory_items ii
        WHERE ii.org_id = v_org
          AND (p_location_id IS NULL OR ii.location_id = p_location_id)
          AND ii.reorder_point IS NOT NULL
          AND ii.quantity_on_hand < ii.reorder_point
      ),
      'topUsage', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.quantity_used DESC), '[]'::jsonb)
        FROM (
          SELECT
            woi.inventory_item_id,
            inv.name,
            SUM(COALESCE(woi.quantity_used, woi.quantity, 0)) AS quantity_used
          FROM work_order_items woi
          JOIN work_orders wo ON wo.id = woi.work_order_id AND wo.org_id = v_org
          LEFT JOIN inventory_items inv ON inv.id = woi.inventory_item_id
          WHERE woi.inventory_item_id IS NOT NULL
            AND (p_location_id IS NULL OR wo.location_id = p_location_id)
            AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
          GROUP BY woi.inventory_item_id, inv.name
          ORDER BY quantity_used DESC
          LIMIT 10
        ) t
      ),
      'supplierPerformance', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.parts_supplied DESC), '[]'::jsonb)
        FROM (
          SELECT
            s.id AS supplier_id,
            s.name,
            COUNT(inv_item.id) AS parts_supplied,
            AVG(inv_item.cost) AS avg_cost
          FROM suppliers s
          JOIN inventory_items inv_item ON inv_item.vendor_id = s.id AND inv_item.org_id = v_org
          WHERE s.org_id = v_org
            AND (p_location_id IS NULL OR inv_item.location_id = p_location_id)
          GROUP BY s.id, s.name
        ) t
      )
    ),
    'customers', jsonb_build_object(
      'lifetimeValue', (
        SELECT COALESCE(SUM(i.total), 0)
        FROM invoices i
        WHERE i.org_id = v_org
          AND (p_location_id IS NULL OR i.location_id = p_location_id)
          AND COALESCE(i.issued_at, i.created_at) BETWEEN p_start AND p_end
      ),
      'avgPerCustomer', (
        SELECT COALESCE(AVG(total_per_customer), 0)
        FROM (
          SELECT SUM(COALESCE(i.total, 0)) AS total_per_customer
          FROM invoices i
          WHERE i.org_id = v_org
            AND (p_location_id IS NULL OR i.location_id = p_location_id)
          GROUP BY i.customer_id
        ) t
      ),
      'topCustomers', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC), '[]'::jsonb)
        FROM (
          SELECT
            c.id AS customer_id,
            c.first_name,
            c.last_name,
            SUM(COALESCE(i.total, 0)) AS revenue,
            COUNT(*) AS invoices
          FROM invoices i
          JOIN customers c ON c.id = i.customer_id
          WHERE i.org_id = v_org
            AND (p_location_id IS NULL OR i.location_id = p_location_id)
            AND COALESCE(i.issued_at, i.created_at) BETWEEN p_start AND p_end
          GROUP BY c.id, c.first_name, c.last_name
          ORDER BY revenue DESC
          LIMIT 10
        ) t
      ),
      'vehicleHistory', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.visits DESC), '[]'::jsonb)
        FROM (
          SELECT
            v.id AS vehicle_id,
            v.make,
            v.model,
            COUNT(wo.id) AS visits,
            MAX(wo.completed_at) AS last_visit
          FROM vehicles v
          JOIN work_orders wo ON wo.vehicle_id = v.id
          WHERE wo.org_id = v_org
            AND (p_location_id IS NULL OR wo.location_id = p_location_id)
            AND COALESCE(wo.completed_at, wo.created_at) BETWEEN p_start AND p_end
          GROUP BY v.id, v.make, v.model
          ORDER BY visits DESC
          LIMIT 10
        ) t
      )
    ),
    'appointments', jsonb_build_object(
      'byDayOfWeek', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.dow), '[]'::jsonb)
        FROM (
          SELECT
            to_char(a.starts_at, 'Dy') AS day,
            EXTRACT(DOW FROM a.starts_at) AS dow,
            COUNT(*) AS appointments
          FROM appointments a
          WHERE a.org_id = v_org
            AND (p_location_id IS NULL OR a.location_id = p_location_id)
            AND a.starts_at BETWEEN p_start AND p_end
          GROUP BY 1, 2
        ) t
      ),
      'byHour', (
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.hour), '[]'::jsonb)
        FROM (
          SELECT
            EXTRACT(HOUR FROM a.starts_at) AS hour,
            COUNT(*) AS appointments
          FROM appointments a
          WHERE a.org_id = v_org
            AND (p_location_id IS NULL OR a.location_id = p_location_id)
            AND a.starts_at BETWEEN p_start AND p_end
          GROUP BY 1
        ) t
      )
    )
  );
END;
$$;
