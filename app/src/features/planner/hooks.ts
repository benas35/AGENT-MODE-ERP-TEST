import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";
import { getOrgDateKey, getOrgDateRange } from "@/lib/timezone";
import type {
  CanScheduleInput,
  PlannerEditableFields,
  PlannerAppointment,
  PlannerMovePayload,
  PlannerResizePayload,
  PlannerUpdatePayload,
  PlannerTechnician,
  PlannerStatus,
} from "./types";
import { ORG_TIMEZONE } from "./types";
import {
  applyCreateSuccess,
  applyOptimisticCreate,
  applyOptimisticUpdate,
  applyStatusUpdate,
  applyUpdateSuccess,
  revertAppointments,
} from "./reducer";

const TECHNICIAN_COLORS = ["#0f172a", "#7c3aed", "#0f766e", "#1d4ed8", "#b45309", "#be123c"];

const getDateKey = (date: Date) => getOrgDateKey(date);

const getDateRange = (date: Date) => getOrgDateRange(date);

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
  const queryKey = ["planner", "appointments", orgId, dateKey, bayId ?? "all"] as const;

  const selectColumns = `
    id, title, technician_id, bay_id, status, starts_at, ends_at, notes, priority, customer_id, vehicle_id,
    customers:customers(first_name,last_name),
    vehicles:vehicles(make, model, license_plate)
  `;

  const firstRelation = (relation: any) =>
    Array.isArray(relation) ? relation[0] ?? null : relation ?? null;

  const mapRowToAppointment = (row: any): PlannerAppointment => {
    const customer = firstRelation(row.customers);
    const vehicle = firstRelation(row.vehicles);
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
      customerId: row.customer_id ?? null,
      customerName,
      vehicleId: row.vehicle_id ?? null,
      vehicleLabel,
      priority: row.priority ?? 0,
    } satisfies PlannerAppointment;
  };

  const query = useQuery<PlannerAppointment[]>({
    enabled: Boolean(orgId),
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select(selectColumns)
        .eq("org_id", orgId)
        .gte("starts_at", range.start)
        .lt("starts_at", range.end)
        .order("starts_at");

      if (error) {
        throw error;
      }

      const appointments = (data ?? []).map(mapRowToAppointment);

      return bayId ? appointments.filter((appt) => appt.bayId === bayId) : appointments;
    },
  });

  useEffect(() => {
    if (!orgId) {
      return;
    }

    const channel = supabase
      .channel(`planner-appointments-${orgId}-${dateKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `org_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [dateKey, orgId, queryClient, queryKey]);

  const invalidateAppointments = () => {
    queryClient.invalidateQueries({ queryKey });
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

  const createMutation = useMutation<PlannerAppointment, unknown, PlannerEditableFields>({
    mutationFn: async (payload) => {
      if (!orgId) {
        throw new Error("Missing organisation context");
      }

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          org_id: orgId,
          title: payload.title,
          customer_id: payload.customerId,
          vehicle_id: payload.vehicleId,
          technician_id: payload.technicianId,
          bay_id: payload.bayId,
          status: payload.status,
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          notes: payload.notes,
          priority: 0,
          created_by: profile?.id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(selectColumns)
        .single();

      if (error) {
        throw error;
      }

      return mapRowToAppointment(data);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlannerAppointment[]>(queryKey) ?? [];
      const temporaryId = `temp-${Date.now()}`;
      const optimisticAppointment: PlannerAppointment = {
        id: temporaryId,
        title: payload.title,
        technicianId: payload.technicianId,
        bayId: payload.bayId,
        status: payload.status,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        notes: payload.notes,
        customerId: payload.customerId,
        customerName: payload.customerName,
        vehicleId: payload.vehicleId,
        vehicleLabel: payload.vehicleLabel,
        priority: 0,
      };

      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyOptimisticCreate(current, optimisticAppointment, bayId)
      );

      return { previous, temporaryId };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, revertAppointments(context.previous));
      }
    },
    onSuccess: (data, _payload, context) => {
      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyCreateSuccess(current, context?.temporaryId, data, bayId)
      );
    },
    onSettled: invalidateAppointments,
  });

  const updateMutation = useMutation<PlannerAppointment, unknown, PlannerUpdatePayload>({
    mutationFn: async (payload) => {
      const { error, data } = await supabase
        .from("appointments")
        .update({
          title: payload.title,
          customer_id: payload.customerId,
          vehicle_id: payload.vehicleId,
          technician_id: payload.technicianId,
          bay_id: payload.bayId,
          status: payload.status,
          starts_at: payload.startsAt,
          ends_at: payload.endsAt,
          notes: payload.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select(selectColumns)
        .single();

      if (error) {
        throw error;
      }

      return mapRowToAppointment(data);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlannerAppointment[]>(queryKey) ?? [];
      const optimisticAppointment: PlannerAppointment = {
        id: payload.id,
        title: payload.title,
        technicianId: payload.technicianId,
        bayId: payload.bayId,
        status: payload.status,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        notes: payload.notes,
        customerId: payload.customerId,
        customerName: payload.customerName,
        vehicleId: payload.vehicleId,
        vehicleLabel: payload.vehicleLabel,
        priority: 0,
      };

      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyOptimisticUpdate(current, optimisticAppointment, bayId)
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, revertAppointments(context.previous));
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyUpdateSuccess(current, data, bayId)
      );
    },
    onSettled: invalidateAppointments,
  });

  const statusMutation = useMutation<PlannerAppointment, unknown, { id: string; status: PlannerStatus }>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(selectColumns)
        .single();

      if (error) {
        throw error;
      }

      return mapRowToAppointment(data);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlannerAppointment[]>(queryKey) ?? [];

      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyStatusUpdate(current, id, status)
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, revertAppointments(context.previous));
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        applyUpdateSuccess(current, data, bayId)
      );
    },
    onSettled: invalidateAppointments,
  });

  const canSchedule = async ({
    technicianId,
    bayId: targetBayId,
    startsAt,
    endsAt,
    appointmentId,
  }: CanScheduleInput) => {
    if (!orgId) return true;
    const { data, error } = await supabase.rpc("can_schedule", {
      _org: orgId,
      _technician: technicianId,
      _bay: targetBayId,
      _start: startsAt,
      _end: endsAt,
      _appointment: appointmentId ?? null,
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
    createAppointment: async (payload: PlannerEditableFields) => {
      try {
        await createMutation.mutateAsync(payload);
      } catch (error) {
        throw new Error(mapErrorToFriendlyMessage(error));
      }
    },
    updateAppointment: async (payload: PlannerUpdatePayload) => {
      try {
        await updateMutation.mutateAsync(payload);
      } catch (error) {
        throw new Error(mapErrorToFriendlyMessage(error));
      }
    },
    updateStatus: async (id: string, status: PlannerStatus) => {
      try {
        await statusMutation.mutateAsync({ id, status });
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        const friendly = mapErrorToFriendlyMessage(error);
        throw new Error(friendly.description);
      }
    },
    canSchedule,
    refetch: query.refetch,
    isMutating:
      moveMutation.isPending ||
      resizeMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      statusMutation.isPending,
    isStatusMutating: statusMutation.isPending,
  };
};
