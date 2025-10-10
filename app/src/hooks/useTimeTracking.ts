import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimeEntry {
  id: string;
  org_id: string;
  user_id: string;
  work_order_id?: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  total_minutes?: number;
  status: 'CLOCKED_IN' | 'ON_BREAK' | 'CLOCKED_OUT';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface WeekSummary {
  totalMinutes: number;
  daysWorked: number;
  totalBreakMinutes: number;
}

export const useTimeTracking = () => {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [weekSummary, setWeekSummary] = useState<WeekSummary>({
    totalMinutes: 0,
    daysWorked: 0,
    totalBreakMinutes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current date boundaries
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Fetch today's entries
      const { data: todayData, error: todayError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in', startOfToday.toISOString())
        .lte('clock_in', endOfToday.toISOString())
        .order('clock_in', { ascending: false });

      if (todayError) {
        console.error('Error fetching today entries:', todayError);
        setError(todayError.message);
        return;
      }

      setTodayEntries((todayData || []) as TimeEntry[]);
      
      // Find current active entry (not clocked out)
      const activeEntry = (todayData || []).find(entry => entry.status !== 'CLOCKED_OUT');
      setCurrentEntry((activeEntry || null) as TimeEntry | null);

      // Fetch week's summary
      const { data: weekData, error: weekError } = await supabase
        .from('time_entries')
        .select('total_minutes, break_minutes, clock_in')
        .eq('user_id', user.id)
        .gte('clock_in', startOfWeek.toISOString())
        .eq('status', 'CLOCKED_OUT'); // Only completed entries

      if (weekError) {
        console.error('Error fetching week summary:', weekError);
      } else if (weekData) {
        const summary = weekData.reduce((acc, entry) => {
          acc.totalMinutes += entry.total_minutes || 0;
          acc.totalBreakMinutes += entry.break_minutes || 0;
          return acc;
        }, { totalMinutes: 0, totalBreakMinutes: 0 });

        // Count unique days worked
        const uniqueDays = new Set(
          weekData.map(entry => new Date(entry.clock_in).toDateString())
        ).size;

        setWeekSummary({
          ...summary,
          daysWorked: uniqueDays
        });
      }

    } catch (err) {
      console.error('Error in fetchTimeEntries:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, []);

  const clockIn = async (notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          org_id: profile.org_id,
          clock_in: new Date().toISOString(),
          status: 'CLOCKED_IN',
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTimeEntries();
      return data;
    } catch (error) {
      console.error('Error clocking in:', error);
      throw error;
    }
  };

  const clockOut = async (notes?: string) => {
    try {
      if (!currentEntry) throw new Error('No active time entry');

      const clockOutTime = new Date().toISOString();
      
      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime,
          status: 'CLOCKED_OUT',
          notes: notes ? (currentEntry.notes ? `${currentEntry.notes}\n${notes}` : notes) : currentEntry.notes
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      await fetchTimeEntries();
    } catch (error) {
      console.error('Error clocking out:', error);
      throw error;
    }
  };

  const startBreak = async () => {
    try {
      if (!currentEntry || currentEntry.status !== 'CLOCKED_IN') {
        throw new Error('Must be clocked in to start break');
      }

      const { error } = await supabase
        .from('time_entries')
        .update({
          status: 'ON_BREAK'
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      await fetchTimeEntries();
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  };

  const endBreak = async () => {
    try {
      if (!currentEntry || currentEntry.status !== 'ON_BREAK') {
        throw new Error('Must be on break to end break');
      }

      // Calculate break duration (simplified - in real app you'd track break start time)
      const breakMinutes = currentEntry.break_minutes + 15; // Add 15 minutes as example

      const { error } = await supabase
        .from('time_entries')
        .update({
          status: 'CLOCKED_IN',
          break_minutes: breakMinutes
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      await fetchTimeEntries();
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  };

  return {
    currentEntry,
    todayEntries,
    weekSummary,
    loading,
    error,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refreshData: fetchTimeEntries
  };
};