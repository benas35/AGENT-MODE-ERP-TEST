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
import type { Tables } from "@/integrations/supabase/types";

interface EditCustomerModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated?: () => void;
}

type CustomerRecord = Tables<"customers">;

type AddressPayload =
  | null
  | {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  notes: "",
  marketingEmail: true,
  marketingSms: false,
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

export const EditCustomerModal = ({
  customerId,
  open,
  onOpenChange,
  onCustomerUpdated,
}: EditCustomerModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open && customerId) {
      loadCustomer(customerId);
    }
    if (!open) {
      setForm(EMPTY_FORM);
      setLoading(false);
      setSaving(false);
    }
  }, [open, customerId]);

  const loadCustomer = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle<CustomerRecord>();

      if (error) throw error;
      if (!data) throw new Error("Customer not found");

      const address = (data.address as AddressPayload) ?? null;

      setForm({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        mobile: data.mobile ?? "",
        notes: data.notes ?? "",
        marketingEmail: data.marketing_consent_email ?? true,
        marketingSms: data.marketing_consent_sms ?? false,
        line1: address?.line1 ?? "",
        line2: address?.line2 ?? "",
        city: address?.city ?? "",
        state: address?.state ?? "",
        postalCode: address?.postal_code ?? "",
      });
    } catch (error: unknown) {
      console.error("Failed to load customer", error);
      toast({
        title: "Unable to load customer",
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
    () => form.firstName.trim().length > 0 && form.lastName.trim().length > 0,
    [form.firstName, form.lastName]
  );

  const handleSave = async () => {
    if (!customerId || !canSave) return;
    setSaving(true);

    try {
      const addressPayload: AddressPayload = form.line1
        ? {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            postal_code: form.postalCode || undefined,
          }
        : null;

      const { error } = await supabase
        .from("customers")
        .update({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          mobile: form.mobile.trim() || null,
          notes: form.notes.trim() || null,
          marketing_consent_email: form.marketingEmail,
          marketing_consent_sms: form.marketingSms,
          address: addressPayload,
        })
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Customer updated",
        description: `${form.firstName} ${form.lastName} has been updated successfully.`,
      });

      onCustomerUpdated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to update customer", error);
      toast({
        title: "Unable to update customer",
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
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>
            Update customer contact details, preferences, and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Contact information</h3>
              <p className="text-sm text-muted-foreground">
                Keep customer details current to power notifications and reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First name *</Label>
                <Input
                  id="edit-firstName"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last name *</Label>
                <Input
                  id="edit-lastName"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={form.mobile}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, mobile: event.target.value }))
                  }
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
                  disabled={loading}
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
                  Respect opt-in status to stay compliant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Email marketing</p>
                  <p className="text-sm text-muted-foreground">
                    Service reminders, promotions, and follow-ups.
                  </p>
                </div>
                <Switch
                  checked={form.marketingEmail}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, marketingEmail: checked }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">SMS alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Appointment updates and on-the-way texts.
                  </p>
                </div>
                <Switch
                  checked={form.marketingSms}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, marketingSms: checked }))
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Billing address</h3>
              <p className="text-sm text-muted-foreground">
                Used for invoice headers, statements, and reporting segments.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-line1">Address line 1</Label>
              <Input
                id="edit-line1"
                value={form.line1}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, line1: event.target.value }))
                }
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-line2">Address line 2</Label>
              <Input
                id="edit-line2"
                value={form.line2}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, line2: event.target.value }))
                }
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State/Province</Label>
                <Input
                  id="edit-state"
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postal">Postal code</Label>
                <Input
                  id="edit-postal"
                  value={form.postalCode}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                  disabled={loading}
                />
              </div>
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
