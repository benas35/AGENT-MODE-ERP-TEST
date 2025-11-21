import { useState, useEffect, useCallback } from 'react';
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
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const { toast } = useToast();

  const selectColumns = `
    *,
    customer:customers(first_name, last_name, phone),
    vehicle:vehicles(year, make, model, license_plate),
    technician:resources!work_orders_technician_id_fkey(id, name)
  `;

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('work_orders')
        .select(selectColumns)
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
        throw fetchError;
      }

      setWorkOrders((data || []) as WorkOrder[]);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error in fetchWorkOrders:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.dateFrom, options.dateTo, options.locationId, options.technicianId, selectColumns]);

  const hydrateWorkOrder = useCallback(
    async (workOrderId: string, prepend = false) => {
      const { data, error: fetchError } = await supabase
        .from('work_orders')
        .select(selectColumns)
        .eq('id', workOrderId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error hydrating work order', fetchError);
        return;
      }

      if (!data) return;

      setWorkOrders((previous) => {
        const withoutExisting = previous.filter((wo) => wo.id !== workOrderId);
        return prepend ? [data as WorkOrder, ...withoutExisting] : [...withoutExisting, data as WorkOrder];
      });
      setLastUpdate(new Date());
    },
    [selectColumns]
  );

  useEffect(() => {
    fetchWorkOrders();

    const dateKey = `${options.dateFrom.toISOString()}-${options.dateTo.toISOString()}`;
    const filterParts = [
      `created_at=gte.${options.dateFrom.toISOString()}`,
      `created_at=lte.${options.dateTo.toISOString()}`,
    ];

    if (options.locationId) {
      filterParts.push(`location_id=eq.${options.locationId}`);
    }

    if (options.technicianId) {
      filterParts.push(`technician_id=eq.${options.technicianId}`);
    }

    const subscriptionFilter = filterParts.join(',');
    const channelName = `work-orders-realtime-${dateKey}-${options.locationId ?? 'all'}-${options.technicianId ?? 'all'}`;

    setConnectionStatus('connecting');

    const workOrdersChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders',
          filter: subscriptionFilter || undefined,
        },
        (payload) => {
          void hydrateWorkOrder(payload.new.id, true);
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
          table: 'work_orders',
          filter: subscriptionFilter || undefined,
        },
        (payload) => {
          void hydrateWorkOrder(payload.new.id);

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
          table: 'work_orders',
          filter: subscriptionFilter || undefined,
        },
        (payload) => {
          setWorkOrders(prev => prev.filter(wo => wo.id !== payload.old.id));
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    return () => {
      void workOrdersChannel.unsubscribe();
      if (typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(workOrdersChannel);
      }
    };
  }, [fetchWorkOrders, hydrateWorkOrder, options.dateFrom, options.dateTo, options.locationId, options.technicianId, toast]);

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
    await fetchWorkOrders();
  };

  return {
    workOrders,
    loading,
    error,
    lastUpdate,
    connectionStatus,
    moveWorkOrder,
    refreshWorkOrders,
  };
};