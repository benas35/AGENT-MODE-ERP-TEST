import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

type WorkOrderStatus = Exclude<Enums<"work_order_status">, null>;

type WorkOrderWithRelations = Tables<"work_orders"> & {
  customer: Pick<Tables<"customers">, "id" | "first_name" | "last_name" | "phone"> | null;
  vehicle: Pick<
    Tables<"vehicles">,
    "id" | "year" | "make" | "model" | "license_plate"
  > | null;
  technician: (Pick<Tables<"resources">, "id" | "name" | "meta"> & { type?: string }) | null;
};

type TechnicianSummary = {
  id: string;
  name: string;
  status: "available" | "busy" | "off-duty";
  specialty?: string;
  color?: string | null;
};

type DashboardMetrics = {
  todayWorkOrders: number;
  vehiclesInShop: number;
  wipValue: number;
  averageRepairOrder: number;
  busyTechnicians: number;
};

type StatusCounts = Record<WorkOrderStatus, number> & {
  UNKNOWN: number;
};

const DEFAULT_STATUS: WorkOrderStatus = "SCHEDULED";

const parseTechnicianMeta = (meta: Tables<"resources">["meta"]) => {
  if (!meta || typeof meta !== "object") {
    return {} as Record<string, unknown>;
  }
  return meta as Record<string, unknown>;
};

const normalizeStatus = (status: Tables<"work_orders">["status"]): WorkOrderStatus | null => {
  if (!status) return null;
  return status as WorkOrderStatus;
};

export const useDashboardData = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [workOrdersResponse, techniciansResponse] = await Promise.all([
        supabase
          .from("work_orders")
          .select<WorkOrderWithRelations>(`
            id,
            work_order_number,
            title,
            description,
            status,
            total,
            estimated_hours,
            sla_due_at,
            stage_entered_at,
            created_at,
            customer:customers!work_orders_customer_id_fkey(
              id,
              first_name,
              last_name,
              phone
            ),
            vehicle:vehicles!work_orders_vehicle_id_fkey(
              id,
              year,
              make,
              model,
              license_plate
            ),
            technician:resources!work_orders_technician_id_fkey(
              id,
              name,
              meta,
              type
            )
          `)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("resources")
          .select("id, name, type, meta, color")
          .eq("active", true)
          .eq("type", "TECHNICIAN")
          .order("name")
      ]);

      if (workOrdersResponse.error) throw workOrdersResponse.error;
      if (techniciansResponse.error) throw techniciansResponse.error;

      const normalizedWorkOrders = (workOrdersResponse.data || []).map((workOrder) => ({
        ...workOrder,
        status: normalizeStatus(workOrder.status) ?? DEFAULT_STATUS,
      }));

      const normalizedTechnicians = (techniciansResponse.data || []).map((technician) => {
        const meta = parseTechnicianMeta(technician.meta);
        const rawStatus = typeof meta.status === "string" ? meta.status.toLowerCase() : undefined;
        const status: TechnicianSummary["status"] =
          rawStatus === "busy" || rawStatus === "off-duty" ? rawStatus : "available";

        const specialty = typeof meta.specialty === "string" ? meta.specialty : undefined;

        return {
          id: technician.id,
          name: technician.name,
          status,
          specialty,
          color: typeof technician.color === "string" ? technician.color : null,
        } satisfies TechnicianSummary;
      });

      setWorkOrders(normalizedWorkOrders);
      setTechnicians(normalizedTechnicians);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      setWorkOrders([]);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusCounts = useMemo<StatusCounts>(() => {
    const baseCounts: StatusCounts = {
      DRAFT: 0,
      SCHEDULED: 0,
      IN_PROGRESS: 0,
      WAITING_PARTS: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      UNKNOWN: 0,
    };

    for (const workOrder of workOrders) {
      const status = normalizeStatus(workOrder.status) ?? null;
      if (status && status in baseCounts) {
        baseCounts[status as WorkOrderStatus] += 1;
      } else {
        baseCounts.UNKNOWN += 1;
      }
    }

    return baseCounts;
  }, [workOrders]);

  const metrics = useMemo<DashboardMetrics>(() => {
    const today = new Date().toDateString();
    const totals: number[] = [];

    let todayWorkOrders = 0;
    let vehiclesInShop = 0;
    let wipValue = 0;

    for (const workOrder of workOrders) {
      if (workOrder.created_at) {
        const createdAtDate = new Date(workOrder.created_at).toDateString();
        if (createdAtDate === today) {
          todayWorkOrders += 1;
        }
      }

      const status = normalizeStatus(workOrder.status);
      const total = typeof workOrder.total === "number" ? workOrder.total : null;
      if (total !== null) {
        totals.push(total);
      }

      if (status === "IN_PROGRESS" || status === "WAITING_PARTS") {
        vehiclesInShop += 1;
        if (total !== null) {
          wipValue += total;
        }
      }
    }

    const averageRepairOrder = totals.length
      ? totals.reduce((sum, value) => sum + value, 0) / totals.length
      : 0;

    const busyTechnicians = technicians.filter((tech) => tech.status === "busy").length;

    return {
      todayWorkOrders,
      vehiclesInShop,
      wipValue,
      averageRepairOrder,
      busyTechnicians,
    };
  }, [workOrders, technicians]);

  return {
    workOrders,
    technicians,
    statusCounts,
    metrics,
    loading,
    error,
    refresh: fetchData,
  };
};
