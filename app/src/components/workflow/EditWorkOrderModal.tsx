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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingButton } from "@/components/shared/LoadingButton";
import type { Tables } from "@/integrations/supabase/types";

interface EditWorkOrderModalProps {
  workOrderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderUpdated?: () => void;
}

type WorkOrderRecord = Tables<"work_orders">;

type LineItemRecord = Tables<"work_order_items">;

interface WorkflowStageOption {
  id: string;
  name: string;
  color: string;
}

interface TechnicianOption {
  id: string;
  name: string;
}

interface LineItemDraft {
  id: string;
  type: "LABOR" | "PART" | "FEE" | "DISCOUNT";
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  technicianId?: string;
  notes?: string;
  existingId?: string;
}

const generateTempId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const formatDateTimeForInput = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
};

export const EditWorkOrderModal = ({
  workOrderId,
  open,
  onOpenChange,
  onWorkOrderUpdated,
}: EditWorkOrderModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workOrder, setWorkOrder] = useState<WorkOrderRecord | null>(null);
  const [stages, setStages] = useState<WorkflowStageOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);

  useEffect(() => {
    if (open && workOrderId) {
      void Promise.all([loadWorkOrder(workOrderId), fetchStages(), fetchTechnicians()]);
    }
    if (!open) {
      setWorkOrder(null);
      setLineItems([]);
      setSaving(false);
      setLoading(false);
    }
  }, [open, workOrderId]);

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from("workflow_stages")
      .select("id, name, color")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load stages", error);
      toast({
        title: "Unable to load workflow stages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStages(
      (data || []).map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
      }))
    );
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

  const loadWorkOrder = async (id: string) => {
    setLoading(true);
    try {
      const [{ data: order, error: orderError }, { data: items, error: itemsError }] =
        await Promise.all([
          supabase
            .from("work_orders")
            .select("*")
            .eq("id", id)
            .maybeSingle<WorkOrderRecord>(),
          supabase
            .from("work_order_items")
            .select("*")
            .eq("work_order_id", id)
            .order("sort_order", { ascending: true })
            .returns<LineItemRecord[]>(),
        ]);

      if (orderError) throw orderError;
      if (!order) throw new Error("Work order not found");
      if (itemsError) throw itemsError;

      setWorkOrder(order);
      setLineItems(
        (items || []).map((item) => ({
          id: generateTempId(),
          existingId: item.id,
          type: item.type as LineItemDraft["type"],
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unit_price) || 0,
          discountAmount: Number(item.discount_amount) || 0,
          technicianId: item.technician_id ?? undefined,
          notes: item.notes ?? undefined,
        }))
      );
    } catch (error: unknown) {
      console.error("Failed to load work order", error);
      toast({
        title: "Unable to load work order",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLineItemChange = (
    id: string,
    updates: Partial<Omit<LineItemDraft, "id" | "existingId">>
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
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

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice - line.discountAmount;
      return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);

    return { subtotal, total: subtotal };
  }, [lineItems]);

  const canSave = useMemo(() => {
    if (!workOrder) return false;
    if (!workOrder.title || workOrder.title.trim().length === 0) return false;
    return lineItems.every(
      (item) =>
        item.description.trim().length > 0 &&
        item.quantity >= 0 &&
        item.unitPrice >= 0 &&
        item.discountAmount >= 0
    );
  }, [workOrder, lineItems]);

  const handleSave = async () => {
    if (!workOrderId || !workOrder) return;
    if (!canSave) {
      toast({
        title: "Complete required fields",
        description: "Ensure title and line items are filled out correctly.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("work_orders")
        .update({
          title: workOrder.title?.trim() ?? null,
          description: workOrder.description ?? null,
          priority: workOrder.priority ?? null,
          workflow_stage_id: workOrder.workflow_stage_id ?? null,
          estimated_hours: workOrder.estimated_hours ?? null,
          technician_id: workOrder.technician_id ?? null,
          scheduled_at: workOrder.scheduled_at ?? null,
          promised_at: workOrder.promised_at ?? null,
          notes: workOrder.notes ?? null,
          subtotal: totals.subtotal,
          total: totals.total,
        })
        .eq("id", workOrderId);

      if (updateError) throw updateError;

      const { data: orgId, error: orgError } = await supabase.rpc(
        "get_user_org_id"
      );
      if (orgError) throw orgError;
      if (!orgId) throw new Error("Unable to resolve organization context");

      // Replace line items to keep data simple and consistent
      await supabase
        .from("work_order_items")
        .delete()
        .eq("work_order_id", workOrderId);

      if (lineItems.length > 0) {
        const payload = lineItems.map((item, index) => ({
          org_id: orgId,
          work_order_id: workOrderId,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount,
          technician_id: item.technicianId || null,
          notes: item.notes ?? null,
          sort_order: index,
          line_total: item.quantity * item.unitPrice - item.discountAmount,
        }));

        const { error: lineError } = await supabase
          .from("work_order_items")
          .insert(payload);

        if (lineError) throw lineError;
      }

      toast({
        title: "Work order updated",
        description: "Changes have been saved successfully.",
      });

      onWorkOrderUpdated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to update work order", error);
      toast({
        title: "Unable to update work order",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!workOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit work order</DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center text-muted-foreground">
            {loading ? "Loading work order..." : "Select a work order to edit."}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit work order</DialogTitle>
          <DialogDescription>
            Tune work order details, update status, and keep the service team
            aligned.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="items">Services & parts</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={workOrder.title ?? ""}
                  onChange={(event) =>
                    setWorkOrder((prev) =>
                      prev
                        ? { ...prev, title: event.target.value }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={workOrder.priority ?? "normal"}
                  onValueChange={(value) =>
                    setWorkOrder((prev) => (prev ? { ...prev, priority: value } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={workOrder.description ?? ""}
                onChange={(event) =>
                  setWorkOrder((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev
                  )
                }
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workflow stage</Label>
                <Select
                  value={workOrder.workflow_stage_id ?? ""}
                  onValueChange={(value) =>
                    setWorkOrder((prev) =>
                      prev ? { ...prev, workflow_stage_id: value } : prev
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
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
                <Label htmlFor="edit-estimated-hours">Estimated hours</Label>
                <Input
                  id="edit-estimated-hours"
                  type="number"
                  value={workOrder.estimated_hours ?? 0}
                  onChange={(event) =>
                    setWorkOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            estimated_hours: Number(event.target.value) || 0,
                          }
                        : prev
                    )
                  }
                  step={0.5}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Internal notes</Label>
              <Textarea
                id="edit-notes"
                value={workOrder.notes ?? ""}
                onChange={(event) =>
                  setWorkOrder((prev) =>
                    prev ? { ...prev, notes: event.target.value } : prev
                  )
                }
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned technician</Label>
                <Select
                  value={workOrder.technician_id ?? ""}
                  onValueChange={(value) =>
                    setWorkOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            technician_id: value || null,
                          }
                        : prev
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
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
                <Label htmlFor="edit-scheduled">Scheduled start</Label>
                <Input
                  id="edit-scheduled"
                  type="datetime-local"
                  value={formatDateTimeForInput(workOrder.scheduled_at)}
                  onChange={(event) =>
                    setWorkOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            scheduled_at: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : null,
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promised">Promised date</Label>
                <Input
                  id="edit-promised"
                  type="datetime-local"
                  value={formatDateTimeForInput(workOrder.promised_at)}
                  onChange={(event) =>
                    setWorkOrder((prev) =>
                      prev
                        ? {
                            ...prev,
                            promised_at: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : null,
                          }
                        : prev
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-muted/40 text-sm text-muted-foreground space-y-2">
              <p>Scheduling updates keep technicians and customers in sync.</p>
              <p>
                Drag the work order on the workflow board to move it between stages
                after saving.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-full md:w-48">
                      <Label>Type</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value: LineItemDraft["type"]) =>
                          handleLineItemChange(item.id, { type: value })
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
                        value={item.description}
                        onChange={(event) =>
                          handleLineItemChange(item.id, {
                            description: event.target.value,
                          })
                        }
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
                        value={item.quantity}
                        onChange={(event) =>
                          handleLineItemChange(item.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Unit price</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleLineItemChange(item.id, {
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
                        value={item.discountAmount}
                        onChange={(event) =>
                          handleLineItemChange(item.id, {
                            discountAmount: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Line total</Label>
                      <Input
                        readOnly
                        value={(
                          item.quantity * item.unitPrice - item.discountAmount
                        ).toFixed(2)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Technician</Label>
                      <Select
                        value={item.technicianId ?? ""}
                        onValueChange={(value) =>
                          handleLineItemChange(item.id, {
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
                        value={item.notes ?? ""}
                        onChange={(event) =>
                          handleLineItemChange(item.id, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeLineItem(item.id)}
                    >
                      Remove item
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addLineItem}>
                Add line item
              </Button>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-2xl font-semibold">${totals.subtotal.toFixed(2)}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Totals sync to the work order header automatically.
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
            Save changes
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
