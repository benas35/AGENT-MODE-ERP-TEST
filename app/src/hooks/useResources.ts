import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Resource {
  id: string;
  name: string;
  type: 'TECHNICIAN' | 'BAY';
  color: string;
  active: boolean;
  meta: any;
}

export const useResources = (resourceType: 'all' | 'technicians' | 'bays') => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('resources')
          .select('*')
          .eq('active', true)
          .order('name');

        if (resourceType === 'technicians') {
          query = query.eq('type', 'TECHNICIAN');
        } else if (resourceType === 'bays') {
          query = query.eq('type', 'BAY');
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching resources:', fetchError);
          setError(fetchError.message);
          return;
        }

        setResources((data || []) as Resource[]);
      } catch (err) {
        console.error('Error in fetchResources:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [resourceType]);

  return {
    resources,
    loading,
    error,
  };
};