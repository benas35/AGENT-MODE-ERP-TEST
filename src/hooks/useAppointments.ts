import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createAppointmentSchema, updateAppointmentSchema, type CreateAppointmentInput, type UpdateAppointmentInput } from '@/lib/validationSchemas';
import { useToast } from '@/hooks/use-toast';

export const useAppointmentActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAppointment = async (input: CreateAppointmentInput) => {
    try {
      setLoading(true);
      
      // Validate input
      const validated = createAppointmentSchema.parse(input);
      
      // Get user profile to get org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.org_id) {
        throw new Error('User organization not found');
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          org_id: profile.org_id,
          customer_id: validated.customer_id,
          vehicle_id: validated.vehicle_id,
          technician_id: validated.technician_id,
          title: validated.title,
          description: validated.description,
          start_time: validated.start_time.toISOString(),
          end_time: validated.end_time.toISOString(),
          location_id: validated.location_id,
          status: validated.status,
          priority: validated.priority,
          estimated_minutes: validated.estimated_minutes,
          source: validated.source,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        toast({
          title: 'Error Creating Appointment',
          description: `Failed to create appointment: ${error.message}`,
          variant: 'destructive'
        });
        throw error;
      }

      toast({
        title: 'Appointment Created',
        description: 'The appointment has been successfully created.',
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error in createAppointment:', message);
      
      if (err instanceof Error && err.message.includes('row-level security')) {
        toast({
          title: 'Permission Error',
          description: 'You do not have permission to create appointments. Please check with your administrator.',
          variant: 'destructive'
        });
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (input: UpdateAppointmentInput) => {
    try {
      setLoading(true);
      
      // Validate input
      const validated = updateAppointmentSchema.parse(input);
      const { id, ...updateData } = validated;
      
      // Convert dates to ISO strings if they exist
      const updatePayload: any = { ...updateData };
      if (updatePayload.start_time) {
        updatePayload.start_time = updatePayload.start_time.toISOString();
      }
      if (updatePayload.end_time) {
        updatePayload.end_time = updatePayload.end_time.toISOString();
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        toast({
          title: 'Error Updating Appointment',
          description: `Failed to update appointment: ${error.message}`,
          variant: 'destructive'
        });
        throw error;
      }

      toast({
        title: 'Appointment Updated',
        description: 'The appointment has been successfully updated.',
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error in updateAppointment:', message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting appointment:', error);
        toast({
          title: 'Error Deleting Appointment',
          description: `Failed to delete appointment: ${error.message}`,
          variant: 'destructive'
        });
        throw error;
      }

      toast({
        title: 'Appointment Deleted',
        description: 'The appointment has been successfully deleted.',
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error in deleteAppointment:', message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveAppointment = async (appointmentId: string, newStartTime: Date, newEndTime: Date, technicianId?: string) => {
    try {
      setLoading(true);

      const updateData: any = {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString()
      };

      if (technicianId !== undefined) {
        updateData.technician_id = technicianId;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select('*')
        .single();

      if (error) {
        console.error('Error moving appointment:', error);
        toast({
          title: 'Error Moving Appointment',
          description: `Failed to move appointment: ${error.message}`,
          variant: 'destructive'
        });
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error in moveAppointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createAppointment,
    updateAppointment,
    deleteAppointment,
    moveAppointment,
    loading
  };
};
