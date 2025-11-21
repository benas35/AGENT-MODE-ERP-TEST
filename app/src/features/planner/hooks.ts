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

  const query = useQuery<PlannerTechnician[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "technicians", orgId ?? "anonymous"],
    queryFn: async () => {
      if (!orgId) return [];
      const [techniciansResponse, resourcesResponse] = await Promise.all([
        supabase
          .from("technicians")
          .select(
            `id, user_id, skills, availability, created_at, profiles:profiles!technicians_user_id_fkey(first_name,last_name)`
          )
          .eq("org_id", orgId)
          .order("created_at"),
        supabase
          .from("resources")
          .select("id, meta, color")
          .eq("org_id", orgId)
          .eq("type", "TECHNICIAN")
          .eq("active", true),
      ]);

      if (techniciansResponse.error) {
        throw techniciansResponse.error;
      }

      if (resourcesResponse.error) {
        throw resourcesResponse.error;
      }

      const technicianRows = techniciansResponse.data ?? [];
      const resourceRows = resourcesResponse.data ?? [];

      const getMetaString = (meta: Record<string, unknown> | null, key: string) => {
        if (!meta) return null;
        const direct = meta[key];
        if (typeof direct === "string" && direct) {
          return direct;
        }
        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        const camelValue = meta[camelKey];
        if (typeof camelValue === "string" && camelValue) {
          return camelValue;
        }
        return null;
      };

      const resourceByTechnicianId = new Map<string, { id: string; color: string | null }>();
      const resourceByUserId = new Map<string, { id: string; color: string | null }>();

      for (const resource of resourceRows) {
        const meta = (resource.meta as Record<string, unknown> | null) ?? null;
        const technicianId = getMetaString(meta, "technician_id");
        const userIdFromMeta = getMetaString(meta, "user_id");
        if (technicianId) {
          resourceByTechnicianId.set(technicianId, { id: resource.id, color: resource.color ?? null });
        }
        if (userIdFromMeta) {
          resourceByUserId.set(userIdFromMeta, { id: resource.id, color: resource.color ?? null });
        }
      }

      return technicianRows.map((row, index) => {
        const profileData = Array.isArray(row.profiles) ? row.profiles[0] : (row as any).profiles;
        const nameFromProfile = profileData
          ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim()
          : "";
        const fallbackName = row.skills?.[0]
          ? `${row.skills[0].charAt(0).toUpperCase()}${row.skills[0].slice(1)} specialist`
          : `Technician ${index + 1}`;

        const resourceMatch =
          resourceByTechnicianId.get(row.id) ??
          (row.user_id ? resourceByUserId.get(row.user_id) ?? null : null);
        const resourceColor = resourceMatch?.color ?? null;

        return {
          id: row.id,
          name: nameFromProfile || fallbackName,
          userId: row.user_id,
          skills: row.skills ?? [],
          color: resourceColor ?? TECHNICIAN_COLORS[index % TECHNICIAN_COLORS.length],
          resourceId: resourceMatch?.id ?? row.id,
        } satisfies PlannerTechnician;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
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

  const query = useQuery<PlannerBay[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "bays", orgId ?? "anonymous"],
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

  return {
    ...query,
    data: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};

export interface ResourceAvailabilityEntry {
  id: string;
  resourceId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ResourceTimeOffEntry {
  id: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

interface CreateAvailabilityInput {
  resourceId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface DeleteAvailabilityInput {
  id: string;
}

interface CreateTimeOffInput {
  resourceId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
}

interface DeleteTimeOffInput {
  id: string;
}

export const usePlannerResourceAvailability = () => {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const queryClient = useQueryClient();

  const availabilityQuery = useQuery<ResourceAvailabilityEntry[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "resource-availability", orgId ?? "anonymous"],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("resource_availability")
        .select("id, resource_id, weekday, start_time, end_time")
        .eq("org_id", orgId)
        .order("weekday")
        .order("start_time");

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        weekday: row.weekday,
        startTime: row.start_time,
        endTime: row.end_time,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const timeOffQuery = useQuery<ResourceTimeOffEntry[]>({
    enabled: Boolean(orgId),
    queryKey: ["planner", "resource-time-off", orgId ?? "anonymous"],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("resource_time_off")
        .select("id, resource_id, start_time, end_time, reason")
        .eq("org_id", orgId)
        .order("start_time");

      if (error) {
        throw error;
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        startTime: row.start_time,
        endTime: row.end_time,
        reason: row.reason ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAvailability = () => {
    queryClient.invalidateQueries({ queryKey: ["planner", "resource-availability", orgId ?? "anonymous"] });
  };

  const invalidateTimeOff = () => {
    queryClient.invalidateQueries({ queryKey: ["planner", "resource-time-off", orgId ?? "anonymous"] });
  };

  const createAvailabilityMutation = useMutation<void, unknown, CreateAvailabilityInput>({
    mutationFn: async ({ resourceId, weekday, startTime, endTime }) => {
      if (!orgId) {
        throw new Error("Missing organisation context");
      }
      const { error } = await supabase.from("resource_availability").insert({
        org_id: orgId,
        resource_id: resourceId,
        weekday,
        start_time: startTime,
        end_time: endTime,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateAvailability,
  });

  const deleteAvailabilityMutation = useMutation<void, unknown, DeleteAvailabilityInput>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("resource_availability").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateAvailability,
  });

  const createTimeOffMutation = useMutation<void, unknown, CreateTimeOffInput>({
    mutationFn: async ({ resourceId, startTime, endTime, reason }) => {
      if (!orgId) {
        throw new Error("Missing organisation context");
      }

      const { error } = await supabase.from("resource_time_off").insert({
        org_id: orgId,
        resource_id: resourceId,
        start_time: startTime,
        end_time: endTime,
        reason: reason ?? null,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateTimeOff,
  });

  const deleteTimeOffMutation = useMutation<void, unknown, DeleteTimeOffInput>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("resource_time_off").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: invalidateTimeOff,
  });

  return {
    availability: availabilityQuery.data ?? [],
    timeOff: timeOffQuery.data ?? [],
    isLoading: availabilityQuery.isLoading || timeOffQuery.isLoading,
    isFetching: availabilityQuery.isFetching || timeOffQuery.isFetching,
    isMutating:
      createAvailabilityMutation.isPending ||
      deleteAvailabilityMutation.isPending ||
      createTimeOffMutation.isPending ||
      deleteTimeOffMutation.isPending,
    createAvailability: async (input: CreateAvailabilityInput) => {
      try {
        await createAvailabilityMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "creating availability");
      }
    },
    deleteAvailability: async (input: DeleteAvailabilityInput) => {
      try {
        await deleteAvailabilityMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "deleting availability");
      }
    },
    createTimeOff: async (input: CreateTimeOffInput) => {
      try {
        await createTimeOffMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "creating time off");
      }
    },
    deleteTimeOff: async (input: DeleteTimeOffInput) => {
      try {
        await deleteTimeOffMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "deleting time off");
      }
    },
  };
};

export const usePlannerAppointments = (date: Date, options: UsePlannerAppointmentsOptions = {}) => {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const { bayId = null } = options;
  const queryClient = useQueryClient();
  const dateKey = getDateKey(date);
  const range = useMemo(() => getDateRange(date), [date]);
  const queryKey = [
    "planner",
    "appointments",
    orgId ?? "anonymous",
    dateKey,
    range.start,
    range.end,
    bayId ?? "all",
  ] as const;

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

    const channelName = `planner-appointments-${orgId}-${dateKey}`;
    const subscriptionFilter = [
      `org_id=eq.${orgId}`,
      `starts_at=gte.${range.start}`,
      `starts_at=lt.${range.end}`,
    ].join(',');

    if (typeof supabase.getChannels === "function") {
      for (const existing of supabase.getChannels()) {
        if (existing.topic === channelName || ("name" in existing && (existing as { name?: string }).name === channelName)) {
          void existing.unsubscribe();
          if (typeof supabase.removeChannel === "function") {
            supabase.removeChannel(existing);
          }
        }
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: subscriptionFilter },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      if (typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
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

  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlannerAppointment[]>(queryKey) ?? [];
      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        current.filter((appointment) => appointment.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, revertAppointments(context.previous));
      }
    },
    onSettled: invalidateAppointments,
  });

  const cancelMutation = useMutation<void, unknown, CancelAppointmentInput>({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase.rpc("cancel_appointment", {
        p_appointment_id: id,
        p_reason: reason ?? null,
      });

      if (error) {
        throw error;
      }
    },
    onSettled: invalidateAppointments,
  });

  const notesMutation = useMutation<PlannerAppointment, unknown, UpdateAppointmentNotesInput>({
    mutationFn: async ({ id, notes }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          notes,
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
    onMutate: async ({ id, notes }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlannerAppointment[]>(queryKey) ?? [];
      queryClient.setQueryData<PlannerAppointment[]>(queryKey, (current = []) =>
        current.map((appointment) =>
          appointment.id === id ? { ...appointment, notes } : appointment
        )
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

  const convertMutation = useMutation<string, unknown, string>({
    mutationFn: async (id) => {
      const { data, error } = await supabase.rpc("create_work_order_from_appointment", {
        p_appointment_id: id,
      });

      if (error) {
        throw error;
      }

      return data as string;
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
        throw mapErrorToFriendlyMessage(error, "moving the appointment");
      }
    },
    resizeAppointment: async (payload: PlannerResizePayload) => {
      try {
        await resizeMutation.mutateAsync(payload);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "resizing the appointment");
      }
    },
    createAppointment: async (payload: PlannerEditableFields) => {
      try {
        await createMutation.mutateAsync(payload);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "creating the appointment");
      }
    },
    updateAppointment: async (payload: PlannerUpdatePayload) => {
      try {
        await updateMutation.mutateAsync(payload);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "updating the appointment");
      }
    },
    updateStatus: async (id: string, status: PlannerStatus) => {
      try {
        await statusMutation.mutateAsync({ id, status });
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "updating the status");
      }
    },
    deleteAppointment: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "deleting the appointment");
      }
    },
    cancelAppointment: async (input: CancelAppointmentInput) => {
      try {
        await cancelMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "cancelling the appointment");
      }
    },
    updateNotes: async (input: UpdateAppointmentNotesInput) => {
      try {
        await notesMutation.mutateAsync(input);
      } catch (error) {
        throw mapErrorToFriendlyMessage(error, "updating notes");
      }
    },
    convertToWorkOrder: async (id: string) => {
      try {
        return await convertMutation.mutateAsync(id);
      } catch (error) {
        const friendly = mapErrorToFriendlyMessage(error, "creating a work order");
        throw friendly;
      }
    },
    canSchedule: async (input: CanScheduleInput) => {
      try {
        return await canSchedule(input);
      } catch (error) {
        const friendly = mapErrorToFriendlyMessage(error, "checking availability");
        throw friendly;
      }
    },
    refetch: query.refetch,
    isMutating:
      moveMutation.isPending ||
      resizeMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      statusMutation.isPending ||
      deleteMutation.isPending ||
      cancelMutation.isPending ||
      notesMutation.isPending ||
      convertMutation.isPending,
    isStatusMutating: statusMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isSavingNotes: notesMutation.isPending,
    isConverting: convertMutation.isPending,
  };
};
