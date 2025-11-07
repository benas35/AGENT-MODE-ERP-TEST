import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useVinDecoding } from "@/hooks/useVinDecoding";

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehicleCreated?: () => void;
}

interface CustomerOption {
  id: string;
  label: string;
}

const INITIAL_STATE = {
  customerId: "",
  vin: "",
  make: "",
  model: "",
  year: "",
  color: "",
  mileage: "",
  licensePlate: "",
  engine: "",
  fuelType: "",
  transmission: "",
  notes: "",
  imageUrl: "",
  active: true,
};

export const AddVehicleModal = ({
  open,
  onOpenChange,
  onVehicleCreated,
}: AddVehicleModalProps) => {
  const { toast } = useToast();
  const { decodeVin, loading: vinLoading } = useVinDecoding();
  const [form, setForm] = useState(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
    if (!open) {
      setForm(INITIAL_STATE);
    }
  }, [open]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true })
      .limit(200);

    if (error) {
      console.error("Failed to load customers", error);
      toast({
        title: "Unable to load customers",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCustomers(
      (data || []).map((customer) => ({
        id: customer.id,
        label: `${customer.first_name} ${customer.last_name}`.trim(),
      }))
    );
  };

  const canSave = useMemo(
    () =>
      Boolean(
        form.customerId && form.make.trim() && form.model.trim() && !saving
      ),
    [form.customerId, form.make, form.model, saving]
  );

  const handleDecodeVin = async () => {
    if (!form.vin || form.vin.length < 5) {
      toast({
        title: "Enter VIN",
        description: "Provide a full VIN to decode vehicle details.",
        variant: "destructive",
      });
      return;
    }

    const result = await decodeVin(form.vin);

    if (!result.success) {
      toast({
        title: "VIN decoding failed",
        description: result.error ?? "Unable to decode VIN.",
        variant: "destructive",
      });
      return;
    }

    const { data } = result;

    setForm((prev) => ({
      ...prev,
      year: data.year ?? prev.year,
      make: data.make ?? prev.make,
      model: data.model ?? prev.model,
      engine: data.engine ?? prev.engine,
      transmission: data.transmission ?? prev.transmission,
      fuelType: data.fuelType ?? prev.fuelType,
    }));

    toast({
      title: "VIN decoded",
      description: "Vehicle details updated from VIN.",
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const { data: orgId, error: orgError } = await supabase.rpc(
        "get_user_org_id"
      );
      if (orgError) throw orgError;
      if (!orgId) throw new Error("Unable to resolve organization context");

      const yearNumber = Number(form.year);
      const mileageNumber = Number(form.mileage);

      const { error } = await supabase.from("vehicles").insert({
        org_id: orgId,
        customer_id: form.customerId,
        vin: form.vin.trim() || null,
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number.isFinite(yearNumber) && yearNumber > 1900 ? yearNumber : null,
        color: form.color.trim() || null,
        mileage:
          Number.isFinite(mileageNumber) && mileageNumber >= 0
            ? mileageNumber
            : null,
        license_plate: form.licensePlate.trim() || null,
        engine: form.engine.trim() || null,
        fuel_type: form.fuelType.trim() || null,
        transmission: form.transmission.trim() || null,
        notes: form.notes.trim() || null,
        image_url: form.imageUrl.trim() || null,
        active: form.active,
      });

      if (error) throw error;

      toast({
        title: "Vehicle added",
        description: `${form.year ? form.year + " " : ""}${form.make} ${form.model} created successfully.`,
      });

      onVehicleCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to add vehicle", error);
      toast({
        title: "Unable to add vehicle",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add vehicle</DialogTitle>
          <DialogDescription>
            Decode VINs, link to a customer, and capture service-critical details.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select
                  value={form.customerId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, customerId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <div className="flex gap-2">
                  <Input
                    id="vin"
                    value={form.vin}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, vin: event.target.value }))
                    }
                    placeholder="17-character VIN"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDecodeVin}
                    disabled={vinLoading}
                  >
                    {vinLoading ? "Decoding" : "Decode"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={form.make}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, make: event.target.value }))
                  }
                  placeholder="Ford"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, model: event.target.value }))
                  }
                  placeholder="F-150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.year}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, year: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License plate</Label>
                <Input
                  id="licensePlate"
                  value={form.licensePlate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      licensePlate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={form.mileage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, mileage: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="engine">Engine</Label>
                <Input
                  id="engine"
                  value={form.engine}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, engine: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel type</Label>
                <Input
                  id="fuelType"
                  value={form.fuelType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fuelType: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Input
                  id="transmission"
                  value={form.transmission}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, transmission: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                placeholder="https://"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                placeholder="Add tire sizes, modifications, or inspection notes"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Active vehicle</p>
                <p className="text-sm text-muted-foreground">
                  Inactive vehicles remain in history but are excluded from reminders.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            disabled={!canSave}
            loadingText="Saving..."
          >
            Save vehicle
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
