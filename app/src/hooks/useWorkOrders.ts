import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  workflow_stage_id?: string;
  stage_entered_at?: string;
  sla_due_at?: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  vehicle_id?: string;
  technician_id?: string;
  service_advisor?: string;
  estimated_hours?: number;
  actual_hours?: number;
  // Related data
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
  } | null;
  vehicle?: {
    year?: number;
    make: string;
    model: string;
    license_plate?: string;
  } | null;
  technician?: {
    display_name?: string;
    name?: string;
  } | null;
  workflow_stage?: {
    name: string;
    color: string;
  };
  total?: number;
}

interface UseWorkOrdersOptions {
  locationId?: string;
  technicianId?: string;
  dateFrom: Date;
  dateTo: Date;
  status?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const useWorkOrders = (options: UseWorkOrdersOptions) => {
  const queryClient = useQueryClient();

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const queryKey = [
    'work-orders',
    options.locationId,
    options.technicianId,
    options.dateFrom.toISOString(),
    options.dateTo.toISOString(),
    options.status ?? null,
    options.search?.trim().toLowerCase() ?? null,
    page,
    pageSize,
  ];

  const selectColumns = `
    *,
    customer:customers(first_name, last_name, phone, email),
    vehicle:vehicles(year, make, model, license_plate),
    technician:resources!work_orders_technician_id_fkey(id, name),
    workflow_stage:workflow_stages(name, color)
  `;

  const fetchWorkOrders = useCallback(async () => {
    const search = options.search?.trim();

    let query = supabase
      .from('work_orders')
      .select(selectColumns, { count: 'exact' })
      .gte('created_at', options.dateFrom.toISOString())
      .lte('created_at', options.dateTo.toISOString())
      .order('created_at', { ascending: false })
      .range(from, to);

      if (options.locationId) {
        query = query.eq('location_id', options.locationId);
      }

      if (options.technicianId) {
        query = query.eq('technician_id', options.technicianId);
      }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (search) {
      query = query.or(
        [
          `work_order_number.ilike.%${search}%`,
          `title.ilike.%${search}%`,
          `description.ilike.%${search}%`,
        ].join(',')
      );
    }

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      throw fetchError;
    }

    const workOrderRows = (data ?? []) as WorkOrder[];
    const normalizedWorkOrders = workOrderRows.map((workOrder) => ({
      ...workOrder,
      technician: workOrder.technician
        ? {
            ...workOrder.technician,
            display_name:
              (workOrder.technician as { display_name?: string; name?: string }).display_name ??
              (workOrder.technician as { display_name?: string; name?: string }).name,
          }
        : null,
    }));

    return {
      workOrders: normalizedWorkOrders,
      total: count ?? workOrderRows.length,
    };
  }, [from, to, options.dateFrom, options.dateTo, options.locationId, options.technicianId, options.status, options.search, selectColumns]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchWorkOrders,
    keepPreviousData: true,
  });

  const moveWorkOrder = async (workOrderId: string, toStageId: string, notes?: string) => {
    try {
      const { error } = await supabase.rpc('move_work_order_stage', {
        p_work_order_id: workOrderId,
        p_to_stage_id: toStageId,
        p_notes: notes
      });

      if (error) {
        console.error('Error moving work order:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      console.error('Error in moveWorkOrder:', error);
      throw error;
    }
  };

  return {
    workOrders: data?.workOrders ?? [],
    totalCount: data?.total ?? 0,
    totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    page,
    pageSize,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    moveWorkOrder,
    refreshWorkOrders: refetch,
  };
};
