import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type VehicleWithCustomer = Tables<"vehicles"> & {
  customer: Pick<Tables<"customers">, "id" | "first_name" | "last_name" | "phone"> | null;
};

export interface VehicleSummary {
  id: string;
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  vin?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
}

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("vehicles")
        .select<VehicleWithCustomer>(`
          id,
          make,
          model,
          year,
          color,
          vin,
          license_plate,
          mileage,
          customer:customers!vehicles_customer_id_fkey(
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      const summaries = (data || []).map<VehicleSummary>((vehicle) => ({
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        vin: vehicle.vin,
        licensePlate: vehicle.license_plate,
        mileage: vehicle.mileage,
        customer: vehicle.customer
          ? {
              id: vehicle.customer.id,
              firstName: vehicle.customer.first_name,
              lastName: vehicle.customer.last_name,
              phone: vehicle.customer.phone,
            }
          : null,
      }));

      setVehicles(summaries);
    } catch (err) {
      console.error("Failed to fetch vehicles", err);
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    refresh: fetchVehicles,
  };
};
