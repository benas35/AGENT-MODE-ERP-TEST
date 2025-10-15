import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_final: boolean;
  sla_hours?: number;
}

export const useWorkflowStages = () => {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('workflow_stages')
          .select('*')
          .order('sort_order');

        if (fetchError) {
          console.error('Error fetching workflow stages:', fetchError);
          setError(fetchError.message);
          return;
        }

        setStages(data || []);
      } catch (err) {
        console.error('Error in fetchStages:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  return {
    stages,
    loading,
    error,
  };
};