import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  default_duration_minutes: number;
  estimated_hours: number;
  operations: any;
  parts: any;
  skills_required: any;
  color: string;
  active: boolean;
}

export const useServiceTemplates = () => {
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServiceTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('service_templates')
          .select('*')
          .eq('active', true)
          .order('category', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setServiceTemplates(data || []);
      } catch (err) {
        console.error('Error fetching service templates:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceTemplates();
  }, []);

  return {
    serviceTemplates,
    loading,
    error
  };
};