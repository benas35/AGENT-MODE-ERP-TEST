import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const useAppointments = (selectedDate: Date, view: 'day' | 'week' | 'month') => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = () => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate)
        };
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      default:
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate)
        };
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);

        const { start, end } = getDateRange();

        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            customers (
              first_name,
              last_name,
              phone,
              email
            ),
            vehicles (
              make,
              model,
              year,
              license_plate
            )
          `)
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .order('start_time', { ascending: true });

        if (fetchError) {
          console.error('Error fetching appointments:', fetchError);
          setError(fetchError.message);
          return;
        }

        // Fetch resources separately to avoid foreign key issues
        const appointmentIds = (data || []).map((apt: any) => apt.id);
        let appointmentResourcesData: any[] = [];
        
        if (appointmentIds.length > 0) {
          const { data: resourcesData } = await supabase
            .from('appointment_resources')
            .select(`
              appointment_id,
              resources (
                id,
                name,
                type,
                color
              )
            `)
            .in('appointment_id', appointmentIds);
          
          appointmentResourcesData = resourcesData || [];
        }

        // Transform the data to include computed fields
        const transformedAppointments = (data || []).map((appointment: any) => {
          const customer = appointment.customers;
          const vehicle = appointment.vehicles;
          const appointmentResources = appointmentResourcesData
            .filter((ar: any) => ar.appointment_id === appointment.id)
            .map((ar: any) => ar.resources)
            .filter(Boolean);
          
          const technician = appointmentResources.find((r: any) => r?.type === 'TECHNICIAN');
          const bay = appointmentResources.find((r: any) => r?.type === 'BAY');

          return {
            ...appointment,
            customer_name: customer ? `${customer.first_name} ${customer.last_name}` : null,
            customer_phone: customer?.phone,
            customer_email: customer?.email,
            vehicle_info: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
            vehicle_plate: vehicle?.license_plate,
            technician_name: technician?.name,
            technician_color: technician?.color,
            bay_name: bay?.name,
            bay_color: bay?.color,
            resources: appointmentResources
          };
        });

        setAppointments(transformedAppointments);
      } catch (err) {
        console.error('Error in fetchAppointments:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedDate, view]);

  const rescheduleAppointment = async (appointmentId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      const { error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointmentId,
        p_new_start: newStartTime.toISOString(),
        p_new_end: newEndTime.toISOString()
      });

      if (error) {
        console.error('Error rescheduling appointment:', error);
        throw error;
      }

      // Refresh appointments after successful reschedule
      // This will be handled by the useEffect dependency change
    } catch (err) {
      console.error('Error in rescheduleAppointment:', err);
      throw err;
    }
  };

  return {
    appointments,
    loading,
    error,
    rescheduleAppointment
  };
};