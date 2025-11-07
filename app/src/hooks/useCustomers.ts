import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CustomerWithVehicles = Tables<"customers"> & {
  vehicles: Tables<"vehicles">[] | null;
};

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  createdAt?: string | null;
  address?: Tables<"customers">["address"];
  vehicles: Tables<"vehicles">[];
}

const toCustomerSummary = (customer: CustomerWithVehicles): CustomerSummary => ({
  id: customer.id,
  firstName: customer.first_name,
  lastName: customer.last_name,
  email: customer.email,
  phone: customer.phone,
  mobile: customer.mobile,
  createdAt: customer.created_at,
  address: customer.address,
  vehicles: customer.vehicles ?? [],
});

export const useCustomers = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("customers")
        .select<CustomerWithVehicles>(`
          id,
          first_name,
          last_name,
          email,
          phone,
          mobile,
          address,
          created_at,
          vehicles:vehicles!vehicles_customer_id_fkey(
            id,
            make,
            model,
            year,
            license_plate,
            mileage,
            vin,
            color,
            customer_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchError) throw fetchError;

      setCustomers((data || []).map(toCustomerSummary));
    } catch (err) {
      console.error("Failed to fetch customers", err);
      setError(err instanceof Error ? err.message : "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    error,
    refresh: fetchCustomers,
  };
};
