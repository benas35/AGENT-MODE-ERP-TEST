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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { summarizeZodErrors } from "@/lib/validation";
import { workOrderFormSchema } from "@/lib/validationSchemas";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { format } from "date-fns";

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
}

interface CustomerOption {
  id: string;
  fullName: string;
  phone?: string | null;
}

interface VehicleOption {
  id: string;
  label: string;
}

interface WorkflowStageOption {
  id: string;
  name: string;
  color: string;
}

interface TechnicianOption {
  id: string;
  name: string;
}

type StepId = "details" | "lineItems" | "assignment" | "review";

interface LineItemDraft {
  id: string;
  type: "LABOR" | "PART" | "FEE" | "DISCOUNT";
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  technicianId?: string;
  notes?: string;
}

const STEP_CONFIG: Array<{
  id: StepId;
  title: string;
  description: string;
}> = [
  {
    id: "details",
    title: "Customer & Vehicle",
    description: "Select the customer, vehicle, and capture order basics.",
  },
  {
    id: "lineItems",
    title: "Services & Parts",
    description: "Add the labor, parts, and fees included in this job.",
  },
  {
    id: "assignment",
    title: "Technician & Schedule",
    description: "Assign the work and set scheduling expectations.",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm details and generate the work order number.",
  },
];

const generateTempId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export const CreateWorkOrderModal = ({
  open,
  onOpenChange,
  onWorkOrderCreated,
}: CreateWorkOrderModalProps) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<StepId>("details");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [stages, setStages] = useState<WorkflowStageOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const [details, setDetails] = useState({
    title: "",
    description: "",
    customerId: "",
    vehicleId: "",
    priority: "normal",
    workflowStageId: "",
    estimatedHours: 2,
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    {
      id: generateTempId(),
      type: "LABOR",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
    },
  ]);

  const [assignment, setAssignment] = useState({
    technicianId: "",
    scheduledAt: "",
    promisedAt: "",
  });

  useEffect(() => {
    if (!open) {
      setActiveStep("details");
      setDetails({
        title: "",
        description: "",
        customerId: "",
        vehicleId: "",
        priority: "normal",
        workflowStageId: "",
        estimatedHours: 2,
        notes: "",
      });
      setLineItems([
        {
          id: generateTempId(),
          type: "LABOR",
          description: "",
          quantity: 1,
          unitPrice: 0,
          discountAmount: 0,
        },
      ]);
      setAssignment({ technicianId: "", scheduledAt: "", promisedAt: "" });
      return;
    }

    const bootstrap = async () => {
      await Promise.all([
        fetchCustomers(),
        fetchStages(),
        fetchTechnicians(),
      ]);
    };

    bootstrap();
  }, [open]);

  useEffect(() => {
    if (details.customerId) {
      fetchVehicles(details.customerId);
    } else {
      setVehicles([]);
    }
  }, [details.customerId]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, phone")
      .order("first_name", { ascending: true })
      .limit(100);

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
        fullName: `${customer.first_name} ${customer.last_name}`.trim(),
        phone: customer.phone,
      }))
    );
  };

  const fetchVehicles = async (customerId: string) => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, make, model, year, license_plate")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load vehicles", error);
      toast({
        title: "Unable to load vehicles",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setVehicles(
      (data || []).map((vehicle) => ({
        id: vehicle.id,
        label: `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.trim() +
          (vehicle.license_plate ? ` • ${vehicle.license_plate}` : ""),
      }))
    );
  };

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from("workflow_stages")
      .select("id, name, color")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load workflow stages", error);
      toast({
        title: "Unable to load workflow stages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const options = (data || []).map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
    }));
    setStages(options);

    if (!details.workflowStageId && options.length > 0) {
      setDetails((prev) => ({ ...prev, workflowStageId: options[0].id }));
    }
  };

  const fetchTechnicians = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("id, name")
      .eq("type", "TECHNICIAN")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load technicians", error);
      toast({
        title: "Unable to load technicians",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTechnicians(
      (data || []).map((resource) => ({
        id: resource.id,
        name: resource.name,
      }))
    );
  };

  const handleLineItemChange = (
    lineId: string,
    updates: Partial<Omit<LineItemDraft, "id">>
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, ...updates } : item))
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateTempId(),
        type: "LABOR",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
      },
    ]);
  };

  const removeLineItem = (lineId: string) => {
    setLineItems((prev) =>
      prev.length === 1 ? prev : prev.filter((item) => item.id !== lineId)
    );
  };

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice - line.discountAmount;
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);

    return {
      subtotal,
      total: subtotal,
    };
  }, [lineItems]);

  const canProceedFromStep = (step: StepId) => {
    if (step === "details") {
      return (
        details.title.trim().length > 0 &&
        details.customerId !== "" &&
        details.vehicleId !== "" &&
        details.workflowStageId !== ""
      );
    }

    if (step === "lineItems") {
      return lineItems.every(
        (item) =>
          item.description.trim().length > 0 &&
          item.quantity > 0 &&
          item.unitPrice >= 0 &&
          item.discountAmount >= 0
      );
    }

    return true;
  };

  const goToStep = (target: StepId) => {
    const currentIndex = STEP_CONFIG.findIndex((step) => step.id === activeStep);
    const targetIndex = STEP_CONFIG.findIndex((step) => step.id === target);

    if (targetIndex > currentIndex && !canProceedFromStep(activeStep)) {
      toast({
        title: "Complete current step",
        description: "Please finish the required fields before continuing.",
        variant: "destructive",
      });
      return;
    }

    setActiveStep(target);
  };

  const goToNextStep = () => {
    const currentIndex = STEP_CONFIG.findIndex((step) => step.id === activeStep);
    if (currentIndex === STEP_CONFIG.length - 1) return;

    const nextStep = STEP_CONFIG[currentIndex + 1].id;
    goToStep(nextStep);
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_CONFIG.findIndex((step) => step.id === activeStep);
    if (currentIndex === 0) return;

    setActiveStep(STEP_CONFIG[currentIndex - 1].id);
  };

  const handleGeneratePreview = async () => {
    if (generatingPreview) return;
    setGeneratingPreview(true);
    try {
      const { data, error } = await supabase.rpc("generate_next_number", {
        entity_type_param: "work_order_preview",
        org_id_param: null,
        location_id_param: null,
      });

      if (error) throw error;

      toast({
        title: "Preview number generated",
        description: `Next in sequence: ${data}`,
      });
    } catch (error: unknown) {
      console.error("Failed to generate preview number", error);
      toast({
        title: "Unable to preview number",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleSubmit = async () => {
    if (!canProceedFromStep("lineItems")) {
      goToStep("lineItems");
      return;
    }

    const parsed = workOrderFormSchema.safeParse({
      title: details.title,
      description: details.description,
      customerId: details.customerId,
      vehicleId: details.vehicleId,
      priority: details.priority as "low" | "normal" | "high" | "urgent",
      workflowStageId: details.workflowStageId,
      estimatedHours: Number(details.estimatedHours) || 0,
      notes: details.notes,
      lineItems,
      assignment: {
        technicianId: assignment.technicianId || undefined,
        scheduledAt: assignment.scheduledAt || undefined,
        promisedAt: assignment.promisedAt || undefined,
      },
    });

    if (!parsed.success) {
      toast({
        title: "Validation failed",
        description: summarizeZodErrors(parsed.error.issues),
        variant: "destructive",
      });
      return;
    }

    const payload = parsed.data;

    setLoading(true);

    try {
      const [{ data: orgId, error: orgError }, userResponse] = await Promise.all([
        supabase.rpc("get_user_org_id"),
        supabase.auth.getUser(),
      ]);

      if (orgError) throw orgError;
      const user = userResponse.data.user;
      if (!orgId || !user) {
        throw new Error("Unable to resolve organization context");
      }

      const { data: nextNumber, error: numberError } = await supabase.rpc(
        "generate_next_number",
        {
          entity_type_param: "work_order",
          org_id_param: orgId,
          location_id_param: null,
        }
      );

      if (numberError) throw numberError;
      if (!nextNumber) {
        throw new Error("Failed to generate work order number");
      }

      const { data: insertedWorkOrder, error: insertError } = await supabase
        .from("work_orders")
        .insert({
          org_id: orgId,
          work_order_number: nextNumber,
          created_by: user.id,
          customer_id: payload.customerId,
          vehicle_id: payload.vehicleId,
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          workflow_stage_id: payload.workflowStageId,
          estimated_hours: payload.estimatedHours,
          notes: payload.notes,
          technician_id: payload.assignment.technicianId || null,
          scheduled_at: payload.assignment.scheduledAt || null,
          promised_at: payload.assignment.promisedAt || null,
          status: "DRAFT",
          stage_entered_at: new Date().toISOString(),
          subtotal: totals.subtotal,
          total: totals.total,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!insertedWorkOrder) throw new Error("Work order creation failed");

      const workOrderId = insertedWorkOrder.id;

      if (payload.lineItems.length > 0) {
        const linePayload = payload.lineItems.map((line, index) => ({
          org_id: orgId,
          work_order_id: workOrderId,
          type: line.type,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          discount_amount: line.discountAmount,
          technician_id: line.technicianId || null,
          notes: line.notes ?? null,
          sort_order: index,
          line_total: line.quantity * line.unitPrice - line.discountAmount,
        }));

        const { error: lineError } = await supabase
          .from("work_order_items")
          .insert(linePayload);

        if (lineError) throw lineError;
      }

      toast({
        title: "Work order created",
        description: `Work order ${nextNumber} has been created successfully.`,
      });

      onWorkOrderCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to create work order", error);
      toast({
        title: "Unable to create work order",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepNavigation = () => (
    <div className="flex items-start gap-4 border-b pb-4 mb-6 overflow-x-auto">
      {STEP_CONFIG.map((step, index) => {
        const stepIndex = index + 1;
        const isActive = activeStep === step.id;
        const currentIndex = STEP_CONFIG.findIndex((item) => item.id === activeStep);
        const isCompleted = stepIndex - 1 < currentIndex;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => goToStep(step.id)}
            className={cn(
              "flex-1 min-w-[180px] rounded-lg border p-4 text-left transition hover:border-primary",
              isActive && "border-primary bg-primary/5",
              isCompleted && !isActive && "border-green-500 bg-green-500/10",
              !isActive && !isCompleted && "border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <Badge
                variant={isCompleted ? "default" : isActive ? "secondary" : "outline"}
                className={cn(
                  "h-8 w-8 items-center justify-center",
                  isCompleted && "bg-green-500 hover:bg-green-600"
                )}
              >
                {stepIndex}
              </Badge>
              <div>
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={details.title}
            onChange={(event) =>
              setDetails((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="e.g. 60k Service & Brake Inspection"
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={details.priority}
            onValueChange={(value) =>
              setDetails((prev) => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={details.description}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Outline the requested services, symptoms, and expectations"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select
            value={details.customerId}
            onValueChange={(value) =>
              setDetails((prev) => ({
                ...prev,
                customerId: value,
                vehicleId: "",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex flex-col text-left">
                    <span>{customer.fullName}</span>
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground">
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vehicle *</Label>
          <Select
            value={details.vehicleId}
            onValueChange={(value) =>
              setDetails((prev) => ({ ...prev, vehicleId: value }))
            }
            disabled={!details.customerId}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                details.customerId
                  ? "Select vehicle"
                  : "Select a customer first"
              } />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Workflow Stage *</Label>
          <Select
            value={details.workflowStageId}
            onValueChange={(value) =>
              setDetails((prev) => ({ ...prev, workflowStageId: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select initial stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            min={0}
            step={0.5}
            value={details.estimatedHours}
            onChange={(event) =>
              setDetails((prev) => ({
                ...prev,
                estimatedHours: Number(event.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea
          id="notes"
          value={details.notes}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, notes: event.target.value }))
          }
          placeholder="Any internal notes or important context for the team"
          rows={3}
        />
      </div>
    </div>
  );

  const renderLineItemsStep = () => (
    <div className="space-y-6">
      {lineItems.map((line) => (
        <div
          key={line.id}
          className="rounded-lg border p-4 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-full md:w-48">
              <Label>Type</Label>
              <Select
                value={line.type}
                onValueChange={(value: LineItemDraft["type"]) =>
                  handleLineItemChange(line.id, { type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LABOR">Labor</SelectItem>
                  <SelectItem value="PART">Part</SelectItem>
                  <SelectItem value="FEE">Fee</SelectItem>
                  <SelectItem value="DISCOUNT">Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Description</Label>
              <Input
                value={line.description}
                onChange={(event) =>
                  handleLineItemChange(line.id, { description: event.target.value })
                }
                placeholder="Describe the service or part"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                step={0.25}
                value={line.quantity}
                onChange={(event) =>
                  handleLineItemChange(line.id, {
                    quantity: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Unit Price</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.unitPrice}
                onChange={(event) =>
                  handleLineItemChange(line.id, {
                    unitPrice: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Discount</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.discountAmount}
                onChange={(event) =>
                  handleLineItemChange(line.id, {
                    discountAmount: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Line Total</Label>
              <Input
                readOnly
                value={
                  (line.quantity * line.unitPrice - line.discountAmount).toFixed(2)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Assigned Technician</Label>
              <Select
                value={line.technicianId ?? ""}
                onValueChange={(value) =>
                  handleLineItemChange(line.id, {
                    technicianId: value || undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={line.notes ?? ""}
                onChange={(event) =>
                  handleLineItemChange(line.id, { notes: event.target.value })
                }
                placeholder="Optional notes about this item"
              />
            </div>
          </div>

          {lineItems.length > 1 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeLineItem(line.id)}
              >
                Remove item
              </Button>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={addLineItem}>
          Add another item
        </Button>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-xl font-semibold">${totals.subtotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );

  const renderAssignmentStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary Technician</Label>
          <Select
            value={assignment.technicianId}
            onValueChange={(value) =>
              setAssignment((prev) => ({ ...prev, technicianId: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Scheduled Start</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            value={assignment.scheduledAt}
            onChange={(event) =>
              setAssignment((prev) => ({
                ...prev,
                scheduledAt: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="promisedAt">Promised Date</Label>
          <Input
            id="promisedAt"
            type="datetime-local"
            value={assignment.promisedAt}
            onChange={(event) =>
              setAssignment((prev) => ({
                ...prev,
                promisedAt: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Estimated Hours</Label>
          <Input readOnly value={details.estimatedHours} />
          <p className="text-xs text-muted-foreground">
            Adjust in the Details step if required.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-medium mb-2">Scheduling guidance</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Drag the work order onto the workflow board after creation.</li>
          <li>Scheduled and promised dates feed service reminders and notifications.</li>
          <li>Technicians can be reassigned later from the work order header.</li>
        </ul>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedCustomer = customers.find(
      (customer) => customer.id === details.customerId
    );
    const selectedVehicle = vehicles.find(
      (vehicle) => vehicle.id === details.vehicleId
    );
    const selectedStage = stages.find(
      (stage) => stage.id === details.workflowStageId
    );
    const selectedTechnician = technicians.find(
      (tech) => tech.id === assignment.technicianId
    );

    return (
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h4 className="font-semibold mb-2">Summary</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">
                {selectedCustomer?.fullName ?? "Not selected"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd className="font-medium">
                {selectedVehicle?.label ?? "Not selected"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stage</dt>
              <dd className="font-medium">
                {selectedStage?.name ?? "Not selected"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="font-medium">{details.priority}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Technician</dt>
              <dd className="font-medium">
                {selectedTechnician?.name ?? "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scheduled</dt>
              <dd className="font-medium">
                {assignment.scheduledAt
                  ? format(new Date(assignment.scheduledAt), "PPpp")
                  : "Not scheduled"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Promised</dt>
              <dd className="font-medium">
                {assignment.promisedAt
                  ? format(new Date(assignment.promisedAt), "PPpp")
                  : "Not promised"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estimate</dt>
              <dd className="font-medium">${totals.total.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h4 className="font-semibold">Line items</h4>
          </div>
          <div className="divide-y">
            {lineItems.map((line) => (
              <div key={line.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-medium">{line.description}</p>
                  <p className="text-xs text-muted-foreground">{line.type}</p>
                </div>
                <div className="text-sm">
                  Qty: {line.quantity}
                </div>
                <div className="text-sm">
                  Rate: ${line.unitPrice.toFixed(2)}
                </div>
                <div className="text-sm text-right">
                  Total: ${(line.quantity * line.unitPrice - line.discountAmount).toFixed(2)}
                </div>
              </div>
            ))}
            {lineItems.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No items have been added.
              </div>
            )}
          </div>
          <div className="flex justify-between p-4 bg-muted/40">
            <span className="text-sm font-medium">Grand total</span>
            <span className="text-lg font-semibold">
              ${totals.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h4 className="font-semibold">Need a fresh number?</h4>
              <p className="text-sm text-muted-foreground">
                Generate the next work order number in the sequence before saving.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={generatingPreview}
            >
              {generatingPreview ? "Generating..." : "Preview number"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveStep = () => {
    switch (activeStep) {
      case "details":
        return renderDetailsStep();
      case "lineItems":
        return renderLineItemsStep();
      case "assignment":
        return renderAssignmentStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create work order</DialogTitle>
          <DialogDescription>
            Progress through the steps to capture everything needed for a
            production-ready work order.
          </DialogDescription>
        </DialogHeader>

        {renderStepNavigation()}
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {renderActiveStep()}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goToPreviousStep}>
              Back
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          {activeStep === "review" ? (
            <LoadingButton onClick={handleSubmit} loading={loading} loadingText="Creating...">
              Create work order
            </LoadingButton>
          ) : (
            <Button type="button" onClick={goToNextStep}>
              Continue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
