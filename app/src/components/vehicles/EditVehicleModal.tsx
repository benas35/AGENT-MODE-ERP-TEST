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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingButton } from "@/components/shared/LoadingButton";
import type { Tables } from "@/integrations/supabase/types";

interface EditVehicleModalProps {
  vehicleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehicleUpdated?: () => void;
}

type VehicleRecord = Tables<"vehicles">;

const EMPTY_FORM = {
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

export const EditVehicleModal = ({
  vehicleId,
  open,
  onOpenChange,
  onVehicleUpdated,
}: EditVehicleModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && vehicleId) {
      loadVehicle(vehicleId);
    }
    if (!open) {
      setForm(EMPTY_FORM);
      setLoading(false);
      setSaving(false);
    }
  }, [open, vehicleId]);

  const loadVehicle = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .maybeSingle<VehicleRecord>();

      if (error) throw error;
      if (!data) throw new Error("Vehicle not found");

      setForm({
        vin: data.vin ?? "",
        make: data.make,
        model: data.model,
        year: data.year ? String(data.year) : "",
        color: data.color ?? "",
        mileage: data.mileage ? String(data.mileage) : "",
        licensePlate: data.license_plate ?? "",
        engine: data.engine ?? "",
        fuelType: data.fuel_type ?? "",
        transmission: data.transmission ?? "",
        notes: data.notes ?? "",
        imageUrl: data.image_url ?? "",
        active: data.active ?? true,
      });
    } catch (error: unknown) {
      console.error("Failed to load vehicle", error);
      toast({
        title: "Unable to load vehicle",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const canSave = useMemo(
    () => form.make.trim().length > 0 && form.model.trim().length > 0,
    [form.make, form.model]
  );

  const handleSave = async () => {
    if (!vehicleId || !canSave) return;
    setSaving(true);

    try {
      const yearNumber = Number(form.year);
      const mileageNumber = Number(form.mileage);

      const { error } = await supabase
        .from("vehicles")
        .update({
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
        })
        .eq("id", vehicleId);

      if (error) throw error;

      toast({
        title: "Vehicle updated",
        description: `${form.make} ${form.model} has been updated successfully.`,
      });

      onVehicleUpdated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to update vehicle", error);
      toast({
        title: "Unable to update vehicle",
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
          <DialogTitle>Edit vehicle</DialogTitle>
          <DialogDescription>
            Update key specs, mileage, and lifecycle status.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-vin">VIN</Label>
                <Input
                  id="edit-vin"
                  value={form.vin}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, vin: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License plate</Label>
                <Input
                  id="edit-license"
                  value={form.licensePlate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, licensePlate: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-make">Make *</Label>
                <Input
                  id="edit-make"
                  value={form.make}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, make: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Model *</Label>
                <Input
                  id="edit-model"
                  value={form.model}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, model: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={form.year}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, year: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mileage">Mileage</Label>
                <Input
                  id="edit-mileage"
                  type="number"
                  value={form.mileage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, mileage: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-engine">Engine</Label>
                <Input
                  id="edit-engine"
                  value={form.engine}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, engine: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fuel">Fuel type</Label>
                <Input
                  id="edit-fuel"
                  value={form.fuelType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fuelType: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-transmission">Transmission</Label>
                <Input
                  id="edit-transmission"
                  value={form.transmission}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, transmission: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                placeholder="https://"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
                placeholder="Add diagnostics, service history notes, or modifications"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Active vehicle</p>
                <p className="text-sm text-muted-foreground">
                  Toggle inactive when the customer sells or retires the vehicle.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked }))
                }
                disabled={loading}
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
            disabled={!canSave || loading}
            loadingText="Saving..."
          >
            Save changes
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
