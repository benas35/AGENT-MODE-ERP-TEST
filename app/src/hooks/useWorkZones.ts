import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkZone {
  id: string;
  org_id: string;
  branch_id?: string;
  name: string;
  code: string;
  description?: string;
  capacity: number;
  color: string;
  equipment: any;
  skills_required: any;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useWorkZones = (branchId?: string) => {
  const [workZones, setWorkZones] = useState<WorkZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkZones = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('work_zones')
          .select('*')
          .eq('active', true)
          .order('sort_order');

        if (branchId) {
          query = query.eq('branch_id', branchId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching work zones:', fetchError);
          setError(fetchError.message);
          return;
        }

        setWorkZones((data || []) as WorkZone[]);
      } catch (err) {
        console.error('Error in fetchWorkZones:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkZones();
  }, [branchId]);

  const updateWorkZone = async (id: string, updates: Partial<WorkZone>) => {
    try {
      const { data, error } = await supabase
        .from('work_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWorkZones(prev => prev.map(zone => zone.id === id ? data as WorkZone : zone));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating work zone:', error);
      return { data: null, error: error as Error };
    }
  };

  return {
    workZones,
    loading,
    error,
    // TODO: Implement createWorkZone with proper org_id handling
    // createWorkZone,
    updateWorkZone,
  };
};