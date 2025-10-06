import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkOrder {
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
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  vehicle?: {
    year?: number;
    make: string;
    model: string;
    license_plate?: string;
  };
  technician?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

interface UseRealtimeWorkflowOptions {
  locationId?: string;
  technicianId?: string;
  dateFrom: Date;
  dateTo: Date;
}

export const useRealtimeWorkflow = (options: UseRealtimeWorkflowOptions) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch
    const fetchWorkOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('work_orders')
          .select(`
            *,
            customer:customers(first_name, last_name, phone),
            vehicle:vehicles(year, make, model, license_plate),
            technician:resources!work_orders_technician_id_fkey(id, name)
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
          return;
        }

        setWorkOrders((data || []) as WorkOrder[]);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error in fetchWorkOrders:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrders();

    // Set up real-time subscription
    const workOrdersChannel = supabase
      .channel('work-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders'
        },
        (payload) => {
          console.log('New work order created:', payload);
          fetchWorkOrders(); // Refetch to get complete data with relations
          
          toast({
            title: 'New Work Order',
            description: `Work Order #${payload.new.work_order_number} has been created`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders'
        },
        (payload) => {
          console.log('Work order updated:', payload);
          
          // Update local state optimistically
          setWorkOrders(prev => prev.map(wo => 
            wo.id === payload.new.id 
              ? { ...wo, ...payload.new }
              : wo
          ));
          
          // Show notification for stage changes
          if (payload.old.workflow_stage_id !== payload.new.workflow_stage_id) {
            toast({
              title: 'Work Order Updated',
              description: `Work Order #${payload.new.work_order_number} moved to new stage`,
            });
          }
          
          setLastUpdate(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'work_orders'
        },
        (payload) => {
          console.log('Work order deleted:', payload);
          setWorkOrders(prev => prev.filter(wo => wo.id !== payload.old.id));
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workOrdersChannel);
    };
  }, [options.locationId, options.technicianId, options.dateFrom, options.dateTo, toast]);

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

      // The real-time subscription will handle the UI update
      toast({
        title: 'Work Order Updated',
        description: 'Work order stage updated successfully',
      });
    } catch (error) {
      console.error('Error in moveWorkOrder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update work order stage',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const refreshWorkOrders = async () => {
    setLoading(true);
    // The useEffect will handle the actual refetch
    setTimeout(() => setLoading(false), 1000);
  };

  return {
    workOrders,
    loading,
    error,
    lastUpdate,
    moveWorkOrder,
    refreshWorkOrders,
  };
};