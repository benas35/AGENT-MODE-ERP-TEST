import { useMemo } from "react";
import { addDays, startOfDay } from "date-fns";
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";
import type {
  CanScheduleInput,
  PlannerAppointment,
  PlannerMovePayload,
  PlannerResizePayload,
  PlannerTechnician,
} from "./types";
import { ORG_TIMEZONE } from "./types";

const TECHNICIAN_COLORS = ["#0f172a", "#7c3aed", "#0f766e", "#1d4ed8", "#b45309", "#be123c"];

const getDateKey = (date: Date) => formatInTimeZone(date, ORG_TIMEZONE, "yyyy-MM-dd");

const getDateRange = (date: Date) => {
  const zoned = utcToZonedTime(date, ORG_TIMEZONE);
  const start = zonedTimeToUtc(startOfDay(zoned), ORG_TIMEZONE).toISOString();
  const end = zonedTimeToUtc(addDays(startOfDay(zoned), 1), ORG_TIMEZONE).toISOString();
  return { start, end };
};

export const usePlannerTechnicians = () => {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery<PlannerTechnician[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "technicians", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("technicians")
        .select(
          `id, user_id, skills, availability, created_at, profiles:profiles!technicians_user_id_fkey(first_name,last_name)`
        )
        .eq("org_id", orgId)
        .order("created_at");

      if (error) {
        throw error;
      }

      return (data ?? []).map((row, index) => {
        const profileData = Array.isArray(row.profiles) ? row.profiles[0] : (row as any).profiles;
        const nameFromProfile = profileData
          ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim()
          : "";
        const fallbackName = row.skills?.[0]
          ? `${row.skills[0].charAt(0).toUpperCase()}${row.skills[0].slice(1)} specialist`
          : `Technician ${index + 1}`;

        return {
          id: row.id,
          name: nameFromProfile || fallbackName,
          userId: row.user_id,
          skills: row.skills ?? [],
          color: TECHNICIAN_COLORS[index % TECHNICIAN_COLORS.length],
        } satisfies PlannerTechnician;
      });
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};

interface UsePlannerAppointmentsOptions {
  bayId?: string | null;
}

export interface PlannerBay {
  id: string;
  name: string;
}

export const usePlannerBays = () => {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery<PlannerBay[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "bays", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("bays")
        .select("id, name")
        .eq("org_id", orgId)
        .order("name");

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePlannerAppointments = (date: Date, options: UsePlannerAppointmentsOptions = {}) => {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const { bayId = null } = options;
  const queryClient = useQueryClient();
  const dateKey = getDateKey(date);
  const range = useMemo(() => getDateRange(date), [date]);

  const query = useQuery<PlannerAppointment[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "appointments", orgId, dateKey, bayId ?? "all"],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `id, title, technician_id, bay_id, status, starts_at, ends_at, notes, priority,
           customers:customers(first_name,last_name),
           vehicles:vehicles(make, model, license_plate)`
        )
        .eq("org_id", orgId)
        .gte("starts_at", range.start)
        .lt("starts_at", range.end)
        .order("starts_at");

      if (error) {
        throw error;
      }

      const appointments = (data ?? []).map((row) => {
        const customer = (row as any).customers;
        const vehicle = (row as any).vehicles;
        const customerName = customer
          ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || null
          : null;
        const vehicleLabel = vehicle
          ? [vehicle.make, vehicle.model, vehicle.license_plate]
              .filter(Boolean)
              .map((part: string) => part.trim())
              .join(" ") || null
          : null;

        return {
          id: row.id,
          title: row.title,
          technicianId: row.technician_id,
          bayId: row.bay_id,
          status: row.status as PlannerAppointment["status"],
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          notes: row.notes ?? null,
          customerName,
          vehicleLabel,
          priority: row.priority ?? 0,
        } satisfies PlannerAppointment;
      });

      return bayId ? appointments.filter((appt) => appt.bayId === bayId) : appointments;
    },
  });

  const invalidateAppointments = () => {
    queryClient.invalidateQueries({ queryKey: ["planner", "appointments", orgId, dateKey, bayId ?? "all"] });
  };

  const moveMutation = useMutation<void, unknown, PlannerMovePayload>({
    mutationFn: async (payload) => {
      const { error } = await supabase
        .from("appointments")
        .update({
          technician_id: payload.technicianId,
          bay_id: payload.bayId,
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateAppointments,
  });

  const resizeMutation = useMutation<void, unknown, PlannerResizePayload>({
    mutationFn: async (payload) => {
      const { error } = await supabase
        .from("appointments")
        .update({
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateAppointments,
  });

  const canSchedule = async ({ technicianId, bayId: targetBayId, startsAt, endsAt }: CanScheduleInput) => {
    if (!orgId) return true;
    const { data, error } = await supabase.rpc("can_schedule", {
      _org: orgId,
      _technician: technicianId,
      _bay: targetBayId,
      _start: startsAt,
      _end: endsAt,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  };

  return {
    appointments: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    moveAppointment: async (payload: PlannerMovePayload) => {
      try {
        await moveMutation.mutateAsync(payload);
      } catch (error) {
        throw new Error(mapErrorToFriendlyMessage(error));
      }
    },
    resizeAppointment: async (payload: PlannerResizePayload) => {
      try {
        await resizeMutation.mutateAsync(payload);
      } catch (error) {
        throw new Error(mapErrorToFriendlyMessage(error));
      }
    },
    canSchedule,
    refetch: query.refetch,
    isMutating: moveMutation.isPending || resizeMutation.isPending,
  };
};
