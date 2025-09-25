import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

interface TimeOffEvent {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export const useTimeOff = (selectedDate: Date) => {
  const [timeOffEvents, setTimeOffEvents] = useState<TimeOffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeOff = async () => {
      try {
        setLoading(true);
        setError(null);

        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        const { data, error: fetchError } = await supabase
          .from('resource_time_off')
          .select('*')
          .lte('start_time', dayEnd.toISOString())
          .gte('end_time', dayStart.toISOString())
          .order('start_time', { ascending: true });

        if (fetchError) {
          console.error('Error fetching time off:', fetchError);
          setError(fetchError.message);
          return;
        }

        setTimeOffEvents(data || []);
      } catch (err) {
        console.error('Error in fetchTimeOff:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeOff();
  }, [selectedDate]);

  return {
    timeOffEvents,
    loading,
    error,
  };
};