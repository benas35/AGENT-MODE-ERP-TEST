import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  org_id: string;
  name: string;
  code?: string;
  vat_id?: string;
  currency: string;
  payment_terms: string;
  email?: string;
  phone?: string;
  address: any;
  lead_time_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSuppliersOptions {
  active_only?: boolean;
}

export function useSuppliers(options: UseSuppliersOptions = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (options.active_only !== false) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.active_only]);

  const createSupplier = useCallback(async (supplierData: Omit<Supplier, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplierData, org_id: '' }) // org_id will be set by RLS
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? { ...supplier, ...data } : supplier
      ));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    suppliers,
    loading,
    error,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers: fetchSuppliers
  };
}