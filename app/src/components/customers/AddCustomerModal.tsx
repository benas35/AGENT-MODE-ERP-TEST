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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { summarizeZodErrors } from "@/lib/validation";
import { customerSchema, vehicleSchema } from "@/lib/validationSchemas";

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: () => void;
}

interface VehicleDraft {
  make: string;
  model: string;
  year: string;
  vin: string;
  licensePlate: string;
  color: string;
  mileage: string;
  notes: string;
}

const INITIAL_CUSTOMER_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  marketingEmail: true,
  marketingSms: false,
  notes: "",
};

export const AddCustomerModal = ({
  open,
  onOpenChange,
  onCustomerCreated,
}: AddCustomerModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [associateVehicle, setAssociateVehicle] = useState(false);
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER_STATE);
  const [vehicle, setVehicle] = useState<VehicleDraft>({
    make: "",
    model: "",
    year: "",
    vin: "",
    licensePlate: "",
    color: "",
    mileage: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setCustomer(INITIAL_CUSTOMER_STATE);
      setVehicle({
        make: "",
        model: "",
        year: "",
        vin: "",
        licensePlate: "",
        color: "",
        mileage: "",
        notes: "",
      });
      setAssociateVehicle(false);
    }
  }, [open]);

  const canSave = useMemo(() => {
    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      return false;
    }

    if (associateVehicle) {
      return Boolean(vehicle.make.trim() && vehicle.model.trim());
    }

    return true;
  }, [customer.firstName, customer.lastName, associateVehicle, vehicle.make, vehicle.model]);

  const handleSubmit = async () => {
    if (!canSave || saving) return;

    const validatedCustomer = customerSchema.safeParse(customer);
    const validatedVehicle = associateVehicle ? vehicleSchema.safeParse(vehicle) : null;

    if (!validatedCustomer.success || (associateVehicle && validatedVehicle && !validatedVehicle.success)) {
      const issues = [
        ...(validatedCustomer.success ? [] : validatedCustomer.error.issues),
        ...(validatedVehicle && !validatedVehicle.success ? validatedVehicle.error.issues : []),
      ];

      toast({
        title: "Validation failed",
        description: summarizeZodErrors(issues),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const [{ data: orgId, error: orgError }, userResponse] = await Promise.all([
        supabase.rpc("get_user_org_id"),
        supabase.auth.getUser(),
      ]);

      if (orgError) throw orgError;
      const user = userResponse.data.user;
      if (!orgId || !user) throw new Error("User session expired");

      const customerPayload = validatedCustomer.data;

      const addressPayload = customerPayload.line1
        ? {
            line1: customerPayload.line1,
            line2: customerPayload.line2 || undefined,
            city: customerPayload.city || undefined,
            state: customerPayload.state || undefined,
            postal_code: customerPayload.postalCode || undefined,
          }
        : null;

      const { data: createdCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          org_id: orgId,
          created_by: user.id,
          first_name: customerPayload.firstName,
          last_name: customerPayload.lastName,
          email: customerPayload.email || null,
          phone: customerPayload.phone || null,
          mobile: customerPayload.mobile || null,
          address: addressPayload,
          marketing_consent_email: customerPayload.marketingEmail,
          marketing_consent_sms: customerPayload.marketingSms,
          notes: customerPayload.notes || null,
        })
        .select("id")
        .single();

      if (customerError) throw customerError;
      if (!createdCustomer) throw new Error("Customer creation failed");

      if (associateVehicle && validatedVehicle?.success) {
        const year = Number(validatedVehicle.data.year);
        const mileage = Number(validatedVehicle.data.mileage);

        const { error: vehicleError } = await supabase.from("vehicles").insert({
          org_id: orgId,
          customer_id: createdCustomer.id,
          make: validatedVehicle.data.make,
          model: validatedVehicle.data.model,
          year: Number.isFinite(year) && year > 1900 ? year : null,
          vin: validatedVehicle.data.vin || null,
          license_plate: validatedVehicle.data.licensePlate || null,
          color: validatedVehicle.data.color || null,
          mileage: Number.isFinite(mileage) && mileage > 0 ? mileage : null,
          notes: validatedVehicle.data.notes || null,
        });

        if (vehicleError) throw vehicleError;
      }

      toast({
        title: "Customer added",
        description: `${customer.firstName} ${customer.lastName} has been created successfully.`,
      });

      onCustomerCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to add customer", error);
      toast({
        title: "Unable to add customer",
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
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            Capture contact information, preferences, and optionally associate their
            first vehicle.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Customer details</h3>
              <p className="text-sm text-muted-foreground">
                Required fields are marked with an asterisk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={customer.firstName}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  value={customer.lastName}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={customer.phone}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={customer.mobile}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, mobile: event.target.value }))
                  }
                  placeholder="(555) 987-6543"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={customer.notes}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Important instructions, VIP alerts, etc."
                  rows={3}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Communication preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Control how the customer prefers to receive updates and marketing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Email marketing</p>
                  <p className="text-sm text-muted-foreground">
                    Service reminders, promotions, and newsletters.
                  </p>
                </div>
                <Switch
                  checked={customer.marketingEmail}
                  onCheckedChange={(checked) =>
                    setCustomer((prev) => ({ ...prev, marketingEmail: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">SMS alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Work order updates and appointment confirmations.
                  </p>
                </div>
                <Switch
                  checked={customer.marketingSms}
                  onCheckedChange={(checked) =>
                    setCustomer((prev) => ({ ...prev, marketingSms: checked }))
                  }
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Billing address</h3>
              <p className="text-sm text-muted-foreground">
                Addresses help with invoices, statements, and customer segmentation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="line1">Address line 1</Label>
              <Input
                id="line1"
                value={customer.line1}
                onChange={(event) =>
                  setCustomer((prev) => ({ ...prev, line1: event.target.value }))
                }
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line2">Address line 2</Label>
              <Input
                id="line2"
                value={customer.line2}
                onChange={(event) =>
                  setCustomer((prev) => ({ ...prev, line2: event.target.value }))
                }
                placeholder="Suite 200"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={customer.city}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={customer.state}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, state: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  value={customer.postalCode}
                  onChange={(event) =>
                    setCustomer((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Associate vehicle</h3>
                <p className="text-sm text-muted-foreground">
                  Create the customer's primary vehicle record right away.
                </p>
              </div>
              <Switch
                checked={associateVehicle}
                onCheckedChange={setAssociateVehicle}
              />
            </div>

            {associateVehicle && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={vehicle.make}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, make: event.target.value }))
                      }
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={vehicle.model}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, model: event.target.value }))
                      }
                      placeholder="Camry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={vehicle.year}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, year: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN</Label>
                    <Input
                      id="vin"
                      value={vehicle.vin}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, vin: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">License plate</Label>
                    <Input
                      id="licensePlate"
                      value={vehicle.licensePlate}
                      onChange={(event) =>
                        setVehicle((prev) => ({
                          ...prev,
                          licensePlate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={vehicle.color}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, color: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={vehicle.mileage}
                      onChange={(event) =>
                        setVehicle((prev) => ({ ...prev, mileage: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleNotes">Vehicle notes</Label>
                  <Textarea
                    id="vehicleNotes"
                    value={vehicle.notes}
                    onChange={(event) =>
                      setVehicle((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Record condition, modifications, or other important context"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={saving}
            disabled={!canSave}
            loadingText="Saving..."
          >
            Save customer
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
