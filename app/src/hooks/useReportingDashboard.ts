import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ServiceMix = {
  service_type: string;
  revenue: number;
  line_items: number;
};

type SalesByPeriod = {
  period_start: string;
  revenue: number;
  work_orders: number;
};

type TechnicianSales = {
  technician_id: string | null;
  technician_name: string | null;
  work_orders: number;
  revenue: number;
  hours_worked: number;
  efficiency: number | null;
};

type BayUtilization = {
  bay_id: string | null;
  bay_name: string | null;
  booked_hours: number;
  appointments: number;
  utilization_pct: number | null;
};

type InventoryUsage = {
  inventory_item_id: string | null;
  name: string | null;
  quantity_used: number;
};

type SupplierPerformance = {
  supplier_id: string | null;
  name: string | null;
  parts_supplied: number;
  avg_cost: number | null;
};

type CustomerPerformance = {
  customer_id: string;
  first_name: string | null;
  last_name: string | null;
  revenue: number;
  invoices: number;
};

type VehicleHistory = {
  vehicle_id: string;
  make: string;
  model: string;
  visits: number;
  last_visit: string | null;
};

type AppointmentDistribution = {
  day: string;
  dow: number;
  appointments: number;
};

type AppointmentHour = {
  hour: number;
  appointments: number;
};

export interface ReportingSnapshot {
  totals: {
    revenue: number;
    workOrders: number;
    avgTicket: number;
    customers: number;
  };
  salesByPeriod: SalesByPeriod[];
  serviceMix: ServiceMix[];
  salesByTechnician: TechnicianSales[];
  cycleTimes: {
    avgRepairHours: number;
    avgCycleHours: number;
  };
  bayUtilization: BayUtilization[];
  inventory: {
    stockValue: number;
    lowStockCount: number;
    topUsage: InventoryUsage[];
    supplierPerformance: SupplierPerformance[];
  };
  customers: {
    lifetimeValue: number;
    avgPerCustomer: number;
    topCustomers: CustomerPerformance[];
    vehicleHistory: VehicleHistory[];
  };
  appointments: {
    byDayOfWeek: AppointmentDistribution[];
    byHour: AppointmentHour[];
  };
}

export interface UseReportingDashboardOptions {
  startDate: Date;
  endDate: Date;
  period?: 'day' | 'week' | 'month';
  locationId?: string | null;
}

const EMPTY_SNAPSHOT: ReportingSnapshot = {
  totals: { revenue: 0, workOrders: 0, avgTicket: 0, customers: 0 },
  salesByPeriod: [],
  serviceMix: [],
  salesByTechnician: [],
  cycleTimes: { avgRepairHours: 0, avgCycleHours: 0 },
  bayUtilization: [],
  inventory: { stockValue: 0, lowStockCount: 0, topUsage: [], supplierPerformance: [] },
  customers: { lifetimeValue: 0, avgPerCustomer: 0, topCustomers: [], vehicleHistory: [] },
  appointments: { byDayOfWeek: [], byHour: [] },
};

export const normalizeReportingSnapshot = (payload: unknown): ReportingSnapshot => {
  const raw = (payload ?? {}) as Partial<ReportingSnapshot>;

  return {
    totals: raw.totals ?? EMPTY_SNAPSHOT.totals,
    salesByPeriod: Array.isArray(raw.salesByPeriod) ? raw.salesByPeriod as SalesByPeriod[] : [],
    serviceMix: Array.isArray(raw.serviceMix) ? raw.serviceMix as ServiceMix[] : [],
    salesByTechnician: Array.isArray(raw.salesByTechnician) ? raw.salesByTechnician as TechnicianSales[] : [],
    cycleTimes: raw.cycleTimes ?? EMPTY_SNAPSHOT.cycleTimes,
    bayUtilization: Array.isArray(raw.bayUtilization) ? raw.bayUtilization as BayUtilization[] : [],
    inventory: raw.inventory ?? EMPTY_SNAPSHOT.inventory,
    customers: raw.customers ?? EMPTY_SNAPSHOT.customers,
    appointments: raw.appointments ?? EMPTY_SNAPSHOT.appointments,
  };
};

export function useReportingDashboard(options: UseReportingDashboardOptions) {
  const [data, setData] = useState<ReportingSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      p_start: options.startDate.toISOString(),
      p_end: options.endDate.toISOString(),
      p_period: options.period ?? 'week',
      p_location_id: options.locationId ?? null,
    }),
    [options.startDate, options.endDate, options.period, options.locationId],
  );

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: payload, error: rpcError } = await supabase.rpc('reporting_overview', params);

    if (rpcError) {
      setError(rpcError.message);
      setData(EMPTY_SNAPSHOT);
      setLoading(false);
      return;
    }

    setData(normalizeReportingSnapshot(payload));
    setLoading(false);
  }, [params]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { data, loading, error, refresh: fetchSnapshot };
}
