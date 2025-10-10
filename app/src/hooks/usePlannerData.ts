import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkZones } from './useWorkZones';
import { useResources } from './useResources';

interface PlannerAppointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  priority: string;
  customer_id: string;
  vehicle_id?: string;
  work_zone_id?: string;
  delay_reason?: string;
  sla_due_at?: string;
  parts_ready: boolean;
  customer_approved: boolean;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    color: string;
  }>;
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  vehicle?: {
    year?: number;
    make: string;
    model: string;
    license_plate?: string;
  };
}

interface WorkloadData {
  resource_id: string;
  work_zone_id?: string;
  planned_hours: number;
  actual_hours: number;
  utilization_pct: number;
}

export const usePlannerData = (
  selectedDate: Date,
  branchId?: string,
  view: 'day' | 'week' | 'month' = 'week'
) => {
  const [appointments, setAppointments] = useState<PlannerAppointment[]>([]);
  const [workload, setWorkload] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { workZones, loading: zonesLoading } = useWorkZones(branchId);
  const { resources, loading: resourcesLoading } = useResources('all');

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);

    switch (view) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }, [selectedDate, view]);

  useEffect(() => {
    const fetchPlannerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch appointments with related data
        let appointmentsQuery = supabase
          .from('appointments')
          .select(`
            *,
            customers(first_name, last_name, phone),
            vehicles(year, make, model, license_plate)
          `)
          .gte('start_time', dateRange.start.toISOString())
          .lte('start_time', dateRange.end.toISOString())
          .not('status', 'in', '(cancelled,no_show)')
          .order('start_time');

        if (branchId) {
          appointmentsQuery = appointmentsQuery.eq('location_id', branchId);
        }

        const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery;

        if (appointmentsError) {
          throw appointmentsError;
        }

        // Fetch resources for appointments separately
        const appointmentIds = (appointmentsData || []).map(apt => apt.id);
        const { data: resourcesData } = await supabase
          .from('appointment_resources')
          .select(`
            appointment_id,
            resources(id, name, type, color)
          `)
          .in('appointment_id', appointmentIds);

        // Transform appointments data
        const transformedAppointments: PlannerAppointment[] = (appointmentsData || []).map(apt => ({
          ...apt,
          customer: apt.customers,
          vehicle: apt.vehicles,
          resources: resourcesData
            ?.filter(ar => ar.appointment_id === apt.id)
            ?.map((ar: any) => ar.resources) || []
        }));

        setAppointments(transformedAppointments);

        // Fetch workload data
        const { data: workloadData, error: workloadError } = await supabase
          .rpc('calculate_appointment_workload', {
            p_start_time: dateRange.start.toISOString(),
            p_end_time: dateRange.end.toISOString()
          });

        if (workloadError) {
          console.error('Error fetching workload:', workloadError);
        } else {
          setWorkload(workloadData || []);
        }

      } catch (err) {
        console.error('Error fetching planner data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (!zonesLoading && !resourcesLoading) {
      fetchPlannerData();
    }
  }, [dateRange, branchId, zonesLoading, resourcesLoading]);

  const moveAppointment = async (
    appointmentId: string,
    newStartTime: Date,
    newEndTime: Date,
    newWorkZoneId?: string,
    newResourceIds?: string[]
  ) => {
    try {
      // Update appointment times and work zone
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          planned_start: newStartTime.toISOString(),
          planned_end: newEndTime.toISOString(),
          work_zone_id: newWorkZoneId,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      // Update resource assignments if provided
      if (newResourceIds && newResourceIds.length > 0) {
        // Remove existing assignments
        await supabase
          .from('appointment_resources')
          .delete()
          .eq('appointment_id', appointmentId);

        // Add new assignments with org_id
        const { data: orgData } = await supabase.rpc('get_user_org_id');
        const resourceAssignments = newResourceIds.map(resourceId => ({
          appointment_id: appointmentId,
          resource_id: resourceId,
          org_id: orgData
        }));

        await supabase
          .from('appointment_resources')
          .insert(resourceAssignments);
      }

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? {
              ...apt,
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
              planned_start: newStartTime.toISOString(),
              planned_end: newEndTime.toISOString(),
              work_zone_id: newWorkZoneId
            }
          : apt
      ));

      return { success: true, error: null };
    } catch (error) {
      console.error('Error moving appointment:', error);
      return { success: false, error: error as Error };
    }
  };

  const getWorkZoneAppointments = (workZoneId: string) => {
    return appointments.filter(apt => apt.work_zone_id === workZoneId);
  };

  const getResourceAppointments = (resourceId: string) => {
    return appointments.filter(apt => 
      apt.resources.some(resource => resource.id === resourceId)
    );
  };

  const getWorkZoneUtilization = (workZoneId: string) => {
    const workZone = workZones.find(zone => zone.id === workZoneId);
    if (!workZone) return 0;

    const zoneWorkload = workload.find(w => w.work_zone_id === workZoneId);
    if (!zoneWorkload) return 0;

    const maxCapacityHours = workZone.capacity * 8; // Assuming 8-hour workday
    return Math.min((zoneWorkload.planned_hours / maxCapacityHours) * 100, 100);
  };

  const getResourceUtilization = (resourceId: string) => {
    const resourceWorkload = workload.find(w => w.resource_id === resourceId);
    if (!resourceWorkload) return 0;

    const maxHours = 8; // Assuming 8-hour workday
    return Math.min((resourceWorkload.planned_hours / maxHours) * 100, 100);
  };

  return {
    appointments,
    workZones,
    resources,
    workload,
    loading: loading || zonesLoading || resourcesLoading,
    error,
    moveAppointment,
    getWorkZoneAppointments,
    getResourceAppointments,
    getWorkZoneUtilization,
    getResourceUtilization,
    refreshData: () => {
      // Trigger a refresh by updating the dependency
      setLoading(true);
    }
  };
};