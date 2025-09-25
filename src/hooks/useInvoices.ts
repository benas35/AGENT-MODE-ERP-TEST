import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InvoiceWithDetails, InvoiceStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface UseInvoicesOptions {
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  workOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useInvoices = (options: UseInvoicesOptions = {}) => {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers!inner(id, first_name, last_name, email, phone),
          vehicle:vehicles(id, year, make, model, license_plate),
          work_order:work_orders(id, work_order_number, status),
          invoice_items(
            id,
            description,
            type,
            quantity,
            unit_price,
            line_total,
            work_order_item_id
          ),
          payments(
            id,
            amount,
            method,
            received_at,
            reference
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.search) {
        query = query.or(`invoice_number.ilike.%${options.search}%,customer.first_name.ilike.%${options.search}%,customer.last_name.ilike.%${options.search}%`);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId);
      }

      if (options.workOrderId) {
        query = query.eq('work_order_id', options.workOrderId);
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

      setInvoices(data as InvoiceWithDetails[] || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [options, toast]);

  const createInvoice = useCallback(async (invoiceData?: Partial<InvoiceWithDetails>) => {
    try {
      // Get current user/org info
      const { data: userData } = await supabase.auth.getUser();
      const orgId = userData.user?.user_metadata?.org_id;

      // Generate invoice number
      const { data: numberData } = await supabase.rpc('generate_next_number', {
        entity_type_param: 'invoice',
        org_id_param: orgId,
        location_id_param: invoiceData?.location_id || null
      });

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: numberData,
          customer_id: invoiceData?.customer_id!,
          vehicle_id: invoiceData?.vehicle_id,
          work_order_id: invoiceData?.work_order_id,
          status: 'DRAFT' as InvoiceStatus,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          balance_due: 0,
          due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          org_id: orgId,
          created_by: userData.user!.id,
          ...invoiceData
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Invoice created successfully.",
      });

      // Refresh invoices list
      fetchInvoices();

      return data;
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchInvoices, toast]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<InvoiceWithDetails>) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Invoice updated successfully.",
      });

      // Refresh invoices list
      fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice:', err);
      toast({
        title: "Error",
        description: "Failed to update invoice. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchInvoices, toast]);

  const sendInvoice = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'SENT' as InvoiceStatus,
          issued_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Invoice sent to customer.",
      });

      // Refresh invoices list
      fetchInvoices();
    } catch (err) {
      console.error('Error sending invoice:', err);
      toast({
        title: "Error",
        description: "Failed to send invoice. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchInvoices, toast]);

  const recordPayment = useCallback(async (invoiceId: string, paymentData: {
    amount: number;
    method: string;
    reference?: string;
    receivedAt?: Date;
  }) => {
    try {
      // Get current invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('total, balance_due')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        throw invoiceError || new Error('Invoice not found');
      }

      // Record the payment
      const { data: userData } = await supabase.auth.getUser();
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          invoice_id: invoiceId,
          amount: paymentData.amount,
          method: paymentData.method as any,
          reference: paymentData.reference,
          received_at: paymentData.receivedAt?.toISOString() || new Date().toISOString(),
          org_id: userData.user?.user_metadata?.org_id,
          created_by: userData.user!.id
        }]);

      if (paymentError) {
        throw paymentError;
      }

      // Update invoice balance and status
      const newBalance = (invoice.balance_due || invoice.total || 0) - paymentData.amount;
      const newStatus: InvoiceStatus = newBalance <= 0 ? 'PAID' : 'SENT';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          balance_due: Math.max(0, newBalance),
          status: newStatus
        })
        .eq('id', invoiceId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Payment recorded successfully.",
      });

      // Refresh invoices list
      fetchInvoices();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchInvoices, toast]);

  const createFromWorkOrder = useCallback(async (workOrderId: string) => {
    try {
      // Get work order details
      const { data: workOrder, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          work_order_items(*)
        `)
        .eq('id', workOrderId)
        .single();

      if (woError || !workOrder) {
        throw woError || new Error('Work order not found');
      }

      // Generate invoice number
      const { data: numberData } = await supabase.rpc('generate_next_number', {
        entity_type_param: 'invoice',
        org_id_param: workOrder.org_id,
        location_id_param: workOrder.location_id || null
      });

      // Calculate totals from work order items
      const subtotal = workOrder.work_order_items?.reduce((sum: number, item: any) => 
        sum + (item.line_total || 0), 0) || 0;
      const taxAmount = subtotal * 0.1; // Assuming 10% tax rate
      const total = subtotal + taxAmount;

      // Create invoice
      const { data: userData } = await supabase.auth.getUser();
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: numberData,
          customer_id: workOrder.customer_id,
          vehicle_id: workOrder.vehicle_id,
          work_order_id: workOrderId,
          location_id: workOrder.location_id,
          status: 'DRAFT' as InvoiceStatus,
          subtotal,
          tax_amount: taxAmount,
          total,
          balance_due: total,
          due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          org_id: workOrder.org_id,
          created_by: userData.user!.id,
        }])
        .select()
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      // Copy work order items to invoice items
      if (workOrder.work_order_items && workOrder.work_order_items.length > 0) {
        const invoiceItems = workOrder.work_order_items.map((item: any) => ({
          invoice_id: invoice.id,
          work_order_item_id: item.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          taxable: item.taxable,
          org_id: workOrder.org_id
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          throw itemsError;
        }
      }

      toast({
        title: "Success",
        description: "Invoice created from work order successfully.",
      });

      // Refresh invoices list
      fetchInvoices();

      return invoice;
    } catch (err) {
      console.error('Error creating invoice from work order:', err);
      toast({
        title: "Error",
        description: "Failed to create invoice from work order. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  }, [fetchInvoices, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    createInvoice,
    updateInvoice,
    sendInvoice,
    recordPayment,
    createFromWorkOrder,
    refetchInvoices: fetchInvoices,
  };
};