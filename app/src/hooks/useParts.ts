import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Part {
  id: string;
  org_id: string;
  sku: string;
  part_no: string;
  name: string;
  description?: string;
  category_id?: string;
  uom: string;
  barcode?: string;
  brand?: string;
  is_serialized: boolean;
  track_lot: boolean;
  cost_method: string;
  tax_code_id?: string;
  attributes: any;
  default_supplier_id?: string;
  default_warehouse_id?: string;
  default_bin_id?: string;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  reorder_qty: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartCategory {
  id: string;
  org_id: string;
  name: string;
  parent_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryBalance {
  org_id: string;
  location_id?: string;
  part_id: string;
  warehouse_id?: string;
  qty_on_hand: number;
  avg_cost: number;
  total_value: number;
}

interface UsePartsOptions {
  category_id?: string;
  active_only?: boolean;
  include_inventory?: boolean;
}

export function useParts(options: UsePartsOptions = {}) {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('parts')
        .select('*')
        .order('name');

      if (options.category_id) {
        query = query.eq('category_id', options.category_id);
      }

      if (options.active_only !== false) {
        query = query.eq('active', true);
      }

      const { data: partsData, error: partsError } = await query;

      if (partsError) throw partsError;

      setParts(partsData || []);

      // Fetch inventory balances if requested (using stock_ledger for now)
      if (options.include_inventory && partsData) {
        const partIds = partsData.map(p => p.id);
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('stock_ledger')
          .select('part_id, warehouse_id, qty_delta, value_delta')
          .in('part_id', partIds);

        if (inventoryError) throw inventoryError;
        
        // Calculate balances from stock ledger
        const balances: InventoryBalance[] = [];
        const groupedByPart = inventoryData?.reduce((acc: any, item: any) => {
          const key = `${item.part_id}_${item.warehouse_id || 'null'}`;
          if (!acc[key]) {
            acc[key] = {
              part_id: item.part_id,
              warehouse_id: item.warehouse_id,
              qty_on_hand: 0,
              total_value: 0,
              org_id: '',
              location_id: '',
              avg_cost: 0
            };
          }
          acc[key].qty_on_hand += item.qty_delta || 0;
          acc[key].total_value += item.value_delta || 0;
          return acc;
        }, {}) || {};
        
        Object.values(groupedByPart).forEach((balance: any) => {
          balance.avg_cost = balance.qty_on_hand !== 0 ? balance.total_value / balance.qty_on_hand : 0;
          balances.push(balance);
        });
        
        setInventory(balances);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.category_id, options.active_only, options.include_inventory]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('part_categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const createPart = useCallback(async (partData: Omit<Part, 'id' | 'org_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .insert({ ...partData, org_id: '' }) // org_id will be set by RLS
        .select()
        .single();

      if (error) throw error;

      setParts(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updatePart = useCallback(async (id: string, updates: Partial<Part>) => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setParts(prev => prev.map(part => 
        part.id === id ? { ...part, ...data } : part
      ));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deletePart = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('parts')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      setParts(prev => prev.filter(part => part.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getPartInventory = useCallback((partId: string, warehouseId?: string) => {
    if (!options.include_inventory) return null;
    
    return inventory.find(inv => 
      inv.part_id === partId && 
      (!warehouseId || inv.warehouse_id === warehouseId)
    );
  }, [inventory, options.include_inventory]);

  const getLowStockParts = useCallback(() => {
    return parts.filter(part => {
      const inv = getPartInventory(part.id);
      return inv && inv.qty_on_hand <= part.reorder_point;
    });
  }, [parts, getPartInventory]);

  useEffect(() => {
    fetchParts();
    fetchCategories();
  }, [fetchParts, fetchCategories]);

  return {
    parts,
    categories,
    inventory,
    loading,
    error,
    createPart,
    updatePart,
    deletePart,
    getPartInventory,
    getLowStockParts,
    refreshParts: fetchParts,
    refreshCategories: fetchCategories
  };
}