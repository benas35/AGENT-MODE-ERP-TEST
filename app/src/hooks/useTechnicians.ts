import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Technician {
  id: string;
  org_id: string;
  location_id?: string;
  profile_id?: string;
  display_name: string;
  color: string;
  skills: string[];
  is_active: boolean;
  capacity_minutes: number;
  created_at: string;
  updated_at: string;
}

export const useTechnicians = (activeOnly: boolean = true) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('technicians')
          .select('*')
          .order('display_name');

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching technicians:', fetchError);
          setError(fetchError.message);
          return;
        }

        setTechnicians(data || []);
      } catch (err) {
        console.error('Error in fetchTechnicians:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, [activeOnly]);

  const refreshTechnicians = () => {
    setLoading(true);
    // Re-trigger the effect
    const fetchTechnicians = async () => {
      try {
        setError(null);

        let query = supabase
          .from('technicians')
          .select('*')
          .order('display_name');

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching technicians:', fetchError);
          setError(fetchError.message);
          return;
        }

        setTechnicians(data || []);
      } catch (err) {
        console.error('Error in fetchTechnicians:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  };

  return {
    technicians,
    loading,
    error,
    refreshTechnicians
  };
};