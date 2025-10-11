import { useEffect, useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import { addMinutes } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { mapErrorToFriendlyMessage } from "@/lib/errorHandling";
import { safeSubmit, schemaResolver, stringNonEmpty, z } from "@/lib/validation";

import type { PlannerAppointment, PlannerEditableFields, PlannerTechnician } from "./types";
import { ORG_TIMEZONE, PlannerStatus } from "./types";
import type { PlannerBay } from "./hooks";

const statusValues = ["scheduled", "in_progress", "waiting_parts", "completed"] as const satisfies PlannerStatus[];

interface CustomerOption {
  id: string;
  label: string;
}

interface VehicleOption {
  id: string;
  customerId: string | null;
  label: string;
}

interface EditAppointmentDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  technicians: PlannerTechnician[];
  bays: PlannerBay[];
  appointment?: PlannerAppointment | null;
  defaults?: {
    startsAt: string;
    endsAt: string;
    technicianId: string | null;
    bayId: string | null;
  } | null;
  onClose: () => void;
  onSubmit: (values: PlannerEditableFields) => Promise<void>;
  isSubmitting?: boolean;
}

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .transform((value) => (value ? value : null));

const appointmentSchema = z
  .object({
    title: stringNonEmpty("Title is required"),
    customerId: nullableUuid,
    vehicleId: nullableUuid,
    technicianId: nullableUuid,
    bayId: nullableUuid,
    status: z.enum(statusValues),
    startsAt: stringNonEmpty("Start time is required"),
    endsAt: stringNonEmpty("End time is required"),
    notes: z.string().max(2000, "Notes must be 2000 characters or fewer").optional(),
  })
  .refine((value) => new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

type AppointmentFormValues = z.infer<typeof appointmentSchema> & {
  notes: string | undefined;
};

const formatLocalInput = (iso: string) => formatInTimeZone(iso, ORG_TIMEZONE, "yyyy-MM-dd'T'HH:mm");

const toUtcIso = (local: string) => zonedTimeToUtc(local, ORG_TIMEZONE).toISOString();

const getStatusLabel = (status: PlannerStatus) =>
  status
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export const EditAppointmentDrawer = ({
  open,
  mode,
  technicians,
  bays,
  appointment,
  defaults,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EditAppointmentDrawerProps) => {
  const { profile } = useAuth();
  const baseId = useId();
  const orgId = profile?.org_id;

  const initialStart = appointment?.startsAt ?? defaults?.startsAt ?? new Date().toISOString();
  const initialEnd = appointment?.endsAt ?? defaults?.endsAt ?? addMinutes(new Date(), 60).toISOString();

  const initialValues = useMemo<AppointmentFormValues>(
    () => ({
      title: appointment?.title ?? "",
      customerId: appointment?.customerId ?? null,
      vehicleId: appointment?.vehicleId ?? null,
      technicianId: appointment?.technicianId ?? defaults?.technicianId ?? null,
      bayId: appointment?.bayId ?? defaults?.bayId ?? null,
      status: appointment?.status ?? "scheduled",
      startsAt: formatLocalInput(initialStart),
      endsAt: formatLocalInput(initialEnd),
      notes: appointment?.notes ?? "",
    }),
    [appointment?.title, appointment?.customerId, appointment?.vehicleId, appointment?.technicianId, appointment?.bayId, appointment?.status, appointment?.notes, defaults?.technicianId, defaults?.bayId, initialStart, initialEnd],
  );

  const form = useForm<AppointmentFormValues>({
    resolver: schemaResolver(appointmentSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
    }
  }, [form, initialValues, open]);

  const customersQuery = useQuery<CustomerOption[]>({
    enabled: open && Boolean(orgId),
    queryKey: ["planner", "customers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, first_name, last_name")
        .eq("org_id", orgId)
        .order("first_name");

      if (error) {
        throw new Error(mapErrorToFriendlyMessage(error, "loading customers").description);
      }

      return (data ?? []).map((customer) => ({
        id: customer.id,
        label: `${customer.first_name} ${customer.last_name}`.trim(),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const vehiclesQuery = useQuery<VehicleOption[]>({
    enabled: open && Boolean(orgId),
    queryKey: ["planner", "vehicles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, customer_id, make, model, license_plate")
        .eq("org_id", orgId)
        .order("make");

      if (error) {
        throw new Error(mapErrorToFriendlyMessage(error, "loading vehicles").description);
      }

      return (data ?? []).map((vehicle) => ({
        id: vehicle.id,
        customerId: vehicle.customer_id,
        label: [vehicle.make, vehicle.model, vehicle.license_plate].filter(Boolean).join(" "),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const customerId = form.watch("customerId");
  const filteredVehicles = useMemo(() => {
    const allVehicles = vehiclesQuery.data ?? [];
    if (!customerId) return allVehicles;
    return allVehicles.filter((vehicle) => vehicle.customerId === customerId);
  }, [customerId, vehiclesQuery.data]);

  useEffect(() => {
    if (!customerId) {
      return;
    }
    const currentVehicle = form.getValues("vehicleId");
    if (currentVehicle && !filteredVehicles.some((vehicle) => vehicle.id === currentVehicle)) {
      form.setValue("vehicleId", null, { shouldValidate: true, shouldDirty: true });
    }
  }, [customerId, filteredVehicles, form]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = form.handleSubmit(
    safeSubmit(async (values) => {
      const customerOption = (customersQuery.data ?? []).find((option) => option.id === values.customerId) ?? null;
      const vehicleOption = (vehiclesQuery.data ?? []).find((option) => option.id === values.vehicleId) ?? null;

      await onSubmit({
        title: values.title.trim(),
        technicianId: values.technicianId,
        bayId: values.bayId,
        status: values.status,
        startsAt: toUtcIso(values.startsAt),
        endsAt: toUtcIso(values.endsAt),
        notes: values.notes?.trim() ? values.notes.trim() : null,
        customerId: values.customerId,
        customerName: customerOption?.label ?? null,
        vehicleId: values.vehicleId,
        vehicleLabel: vehicleOption?.label ?? null,
      });

      handleClose();
    }),
  );

  const timezoneDescriptor = "Europe/Vilnius (EET/EEST)";

  return (
    <Drawer open={open} onOpenChange={(next) => (!next ? handleClose() : undefined)}>
      <DrawerContent className="max-h-[95vh] overflow-y-auto">
        <DrawerHeader className="space-y-1">
          <DrawerTitle>{mode === "create" ? "New appointment" : "Edit appointment"}</DrawerTitle>
          <DrawerDescription>
            Times are shown in {timezoneDescriptor}. Updates save immediately with undo in the planner history.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field, fieldState }) => {
                  const inputId = `${baseId}-title`;
                  const messageId = `${inputId}-error`;
                  return (
                    <FormItem>
                      <FormLabel htmlFor={inputId}>Title</FormLabel>
                      <FormControl>
                        <Input
                          id={inputId}
                          {...field}
                          autoFocus={mode === "create"}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={fieldState.invalid ? messageId : undefined}
                          placeholder="Diagnostic appointment"
                        />
                      </FormControl>
                      <FormMessage id={messageId} />
                    </FormItem>
                  );
                }}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-customer`;
                    const messageId = `${inputId}-error`;
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Customer</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value === "" ? null : value)}
                          >
                            <SelectTrigger
                              id={inputId}
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? messageId : undefined}
                            >
                              <SelectValue placeholder={customersQuery.isLoading ? "Loading…" : "Select customer"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No customer</SelectItem>
                              {(customersQuery.data ?? []).map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-vehicle`;
                    const messageId = `${inputId}-error`;
                    const placeholder = customerId
                      ? filteredVehicles.length === 0
                        ? "No vehicles for customer"
                        : "Select vehicle"
                      : "Select vehicle";
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Vehicle</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value === "" ? null : value)}
                          >
                            <SelectTrigger
                              id={inputId}
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? messageId : undefined}
                            >
                              <SelectValue placeholder={vehiclesQuery.isLoading ? "Loading…" : placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No vehicle</SelectItem>
                              {filteredVehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-technician`;
                    const messageId = `${inputId}-error`;
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Technician</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value === "" ? null : value)}
                          >
                            <SelectTrigger
                              id={inputId}
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? messageId : undefined}
                            >
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {technicians.map((technician) => (
                                <SelectItem key={technician.id} value={technician.id}>
                                  {technician.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="bayId"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-bay`;
                    const messageId = `${inputId}-error`;
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Bay</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value === "" ? null : value)}
                          >
                            <SelectTrigger
                              id={inputId}
                              aria-invalid={fieldState.invalid}
                              aria-describedby={fieldState.invalid ? messageId : undefined}
                            >
                              <SelectValue placeholder="Select bay" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {bays.map((bay) => (
                                <SelectItem key={bay.id} value={bay.id}>
                                  {bay.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-starts`;
                    const messageId = `${inputId}-error`;
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Starts at</FormLabel>
                        <FormControl>
                          <Input
                            id={inputId}
                            type="datetime-local"
                            step={900}
                            {...field}
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.invalid ? messageId : `${inputId}-hint`}
                          />
                        </FormControl>
                        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                          Snap increments of 15 minutes · {timezoneDescriptor}
                        </p>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field, fieldState }) => {
                    const inputId = `${baseId}-ends`;
                    const messageId = `${inputId}-error`;
                    return (
                      <FormItem>
                        <FormLabel htmlFor={inputId}>Ends at</FormLabel>
                        <FormControl>
                          <Input
                            id={inputId}
                            type="datetime-local"
                            step={900}
                            {...field}
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.invalid ? messageId : `${inputId}-hint`}
                          />
                        </FormControl>
                        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                          Use the planner grid or enter a time in {timezoneDescriptor}
                        </p>
                        <FormMessage id={messageId} />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field, fieldState }) => {
                  const inputId = `${baseId}-status`;
                  const messageId = `${inputId}-error`;
                  return (
                    <FormItem>
                      <FormLabel htmlFor={inputId}>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id={inputId}
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.invalid ? messageId : undefined}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusValues.map((status) => (
                              <SelectItem key={status} value={status}>
                                {getStatusLabel(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage id={messageId} />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => {
                  const inputId = `${baseId}-notes`;
                  const messageId = `${inputId}-error`;
                  const value = field.value ?? "";
                  return (
                    <FormItem>
                      <FormLabel htmlFor={inputId}>Internal notes</FormLabel>
                      <FormControl>
                        <Textarea
                          id={inputId}
                          {...field}
                          value={value}
                          rows={4}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={fieldState.invalid ? messageId : `${inputId}-hint`}
                          placeholder="Add context or technician instructions"
                        />
                      </FormControl>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <p id={`${inputId}-hint`}>{value.length}/2000</p>
                        <FormMessage id={messageId} />
                      </div>
                    </FormItem>
                  );
                }}
              />

              {(customersQuery.isError || vehiclesQuery.isError) && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" aria-live="assertive">
                  {(customersQuery.error as Error | undefined)?.message ??
                    (vehiclesQuery.error as Error | undefined)?.message ??
                    "We couldn't load planner lookups. Try again."}
                </div>
              )}
            </form>
          </Form>
        </div>

        <DrawerFooter className="gap-2 border-t bg-muted/40 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!form.formState.isValid || isSubmitting || form.formState.isSubmitting}
          >
            {mode === "create" ? "Create appointment" : "Save changes"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

