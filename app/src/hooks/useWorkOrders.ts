import { useState, useEffect, useCallback } from 'react';
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
  } | null;
  workflow_stage?: {
    name: string;
    color: string;
  };
}

interface UseWorkOrdersOptions {
  locationId?: string;
  technicianId?: string;
  dateFrom: Date;
  dateTo: Date;
}

export const useWorkOrders = (options: UseWorkOrdersOptions) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch work orders with basic joins
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          customer:customers(first_name, last_name, phone, email),
          vehicle:vehicles(year, make, model, license_plate),
          workflow_stage:workflow_stages(name, color)
        `)
        .gte('created_at', options.dateFrom.toISOString())
        .lte('created_at', options.dateTo.toISOString())
        .order('created_at', { ascending: false });

      if (options.locationId) {
        query = query.eq('location_id', options.locationId);
      }

      if (options.technicianId) {
        query = query.eq('technician_id', options.technicianId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching work orders:', fetchError);
        setError(fetchError.message);
        setWorkOrders([]);
        return;
      }

      const workOrderRows = (data ?? []) as WorkOrder[];
      const workOrdersWithTech = await Promise.all(
        workOrderRows.map(async (workOrder) => {
          if (!workOrder.technician_id) {
            return { ...workOrder, technician: null } satisfies WorkOrder;
          }

          const { data: resource } = await supabase
            .from("resources")
            .select("name")
            .eq("id", workOrder.technician_id)
            .eq("type", "TECHNICIAN")
            .maybeSingle();

          const technician = resource?.name
            ? { display_name: resource.name as string }
            : null;

          return { ...workOrder, technician } satisfies WorkOrder;
        }),
      );

      setWorkOrders(workOrdersWithTech);
    } catch (err) {
      console.error('Error in fetchWorkOrders:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [options.locationId, options.technicianId, options.dateFrom, options.dateTo]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

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

      // Optimistically update local state
      setWorkOrders(prev => prev.map(wo => 
        wo.id === workOrderId 
          ? { ...wo, workflow_stage_id: toStageId, stage_entered_at: new Date().toISOString() }
          : wo
      ));
    } catch (error) {
      console.error('Error in moveWorkOrder:', error);
      throw error;
    }
  };

  return {
    workOrders,
    loading,
    error,
    moveWorkOrder,
    refreshWorkOrders: fetchWorkOrders,
  };
};
