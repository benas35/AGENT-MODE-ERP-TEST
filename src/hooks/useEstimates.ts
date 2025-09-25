import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EstimateWithDetails, EstimateStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface UseEstimatesOptions {
  search?: string;
  status?: EstimateStatus;
  customerId?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useEstimates = (options: UseEstimatesOptions = {}) => {
  const [estimates, setEstimates] = useState<EstimateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('estimates')
        .select(`
          *,
          customer:customers!inner(id, first_name, last_name, email, phone),
          vehicle:vehicles(id, year, make, model, license_plate),
          estimate_items(
            id,
            description,
            type,
            quantity,
            unit_price,
            line_total,
            inventory_item_id
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.search) {
        query = query.or(`estimate_number.ilike.%${options.search}%,customer.first_name.ilike.%${options.search}%,customer.last_name.ilike.%${options.search}%`);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      if (options.vehicleId) {
        query = query.eq('vehicle_id', options.vehicleId);
      }

      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setEstimates(data as EstimateWithDetails[] || []);
    } catch (err) {
      console.error('Error fetching estimates:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to load estimates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [options, toast]);

  const createEstimate = useCallback(async (estimateData?: Partial<EstimateWithDetails>) => {
    try {
      // Generate estimate number
      const { data: numberData } = await supabase.rpc('generate_next_number', {
        entity_type_param: 'estimate',
        org_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.org_id,
        location_id_param: estimateData?.location_id || null
      });

      // Get current user/org info
      const { data: userData } = await supabase.auth.getUser();
      const orgId = userData.user?.user_metadata?.org_id;

      const { data, error } = await supabase
        .from('estimates')
        .insert([{
          estimate_number: numberData,
          title: estimateData?.title || 'New Estimate',
          customer_id: estimateData?.customer_id!,
          vehicle_id: estimateData?.vehicle_id!,
          status: 'DRAFT' as EstimateStatus,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          created_by: userData.user!.id,
          org_id: orgId,
          ...estimateData
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Estimate created successfully.",
      });

      // Refresh estimates list
      fetchEstimates();

      return data;
    } catch (err) {
      console.error('Error creating estimate:', err);
      toast({
        title: "Error",
        description: "Failed to create estimate. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEstimates, toast]);

  const updateEstimate = useCallback(async (id: string, updates: Partial<EstimateWithDetails>) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Estimate updated successfully.",
      });

      // Refresh estimates list
      fetchEstimates();
    } catch (err) {
      console.error('Error updating estimate:', err);
      toast({
        title: "Error",
        description: "Failed to update estimate. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEstimates, toast]);

  const deleteEstimate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Estimate deleted successfully.",
      });

      // Refresh estimates list
      fetchEstimates();
    } catch (err) {
      console.error('Error deleting estimate:', err);
      toast({
        title: "Error",
        description: "Failed to delete estimate. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEstimates, toast]);

  const sendEstimate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ 
          status: 'SENT' as EstimateStatus,
          // Set expiry date to 30 days from now if not set
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Estimate sent to customer.",
      });

      // Refresh estimates list
      fetchEstimates();
    } catch (err) {
      console.error('Error sending estimate:', err);
      toast({
        title: "Error",
        description: "Failed to send estimate. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEstimates, toast]);

  const convertToWorkOrder = useCallback(async (estimateId: string) => {
    try {
      // First get the estimate details
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select(`
          *,
          estimate_items(*)
        `)
        .eq('id', estimateId)
        .single();

      if (estimateError || !estimate) {
        throw estimateError || new Error('Estimate not found');
      }

      // Generate work order number
      const { data: numberData } = await supabase.rpc('generate_next_number', {
        entity_type_param: 'work_order',
        org_id_param: estimate.org_id,
        location_id_param: estimate.location_id || null
      });

      // Create work order
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .insert([{
          work_order_number: numberData,
          title: estimate.title || 'Work Order from Estimate',
          description: estimate.description,
          customer_id: estimate.customer_id,
          vehicle_id: estimate.vehicle_id,
          location_id: estimate.location_id,
          status: 'DRAFT',
          estimate_id: estimateId,
          org_id: estimate.org_id,
          created_by: (await supabase.auth.getUser()).data.user!.id
        }])
        .select()
        .single();

      if (woError) {
        throw woError;
      }

      // Copy estimate items to work order items
      if (estimate.estimate_items && estimate.estimate_items.length > 0) {
        const workOrderItems = estimate.estimate_items.map(item => ({
          work_order_id: workOrder.id,
          type: item.type,
          description: item.description,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          org_id: estimate.org_id
        }));

        const { error: itemsError } = await supabase
          .from('work_order_items')
          .insert(workOrderItems);

        if (itemsError) {
          throw itemsError;
        }
      }

      // Update estimate status
      await supabase
        .from('estimates')
        .update({ status: 'APPROVED' as EstimateStatus })
        .eq('id', estimateId);

      toast({
        title: "Success",
        description: "Work order created from estimate successfully.",
      });

      // Refresh estimates list
      fetchEstimates();

      return workOrder;
    } catch (err) {
      console.error('Error converting estimate to work order:', err);
      toast({
        title: "Error",
        description: "Failed to convert estimate to work order. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchEstimates, toast]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  return {
    estimates,
    loading,
    error,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    sendEstimate,
    convertToWorkOrder,
    refetchEstimates: fetchEstimates,
  };
};