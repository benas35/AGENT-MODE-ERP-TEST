import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Trash2, Plus } from "lucide-react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  status: string;
  total: number;
  currency: string;
  expected_at?: string;
  created_at: string;
  line_count: number;
}

interface EditPOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
}

interface POLineItem {
  id: string;
  part_sku: string;
  part_name: string; 
  quantity: number;
  unit_price: number;
  line_total: number;
}

export function EditPOModal({ open, onOpenChange, purchaseOrder }: EditPOModalProps) {
  const [supplier, setSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { suppliers } = useSuppliers();

  // Initialize form when PO is provided
  React.useEffect(() => {
    if (purchaseOrder) {
      setSupplier(purchaseOrder.supplier_name);
      setExpectedDate(purchaseOrder.expected_at || "");
      // Mock line items - in real app, fetch from API
      setLineItems([
        {
          id: "1",
          part_sku: "BRK-PAD-001",
          part_name: "Front Brake Pads - BMW F30",
          quantity: 2,
          unit_price: 89.99,
          line_total: 179.98
        }
      ]);
    }
  }, [purchaseOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier and add at least one line item.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement PO update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Purchase Order Updated",
        description: "Purchase order has been updated successfully."
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    const newItem: POLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      part_sku: "",
      part_name: "",
      quantity: 1,
      unit_price: 0,
      line_total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof POLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.line_total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Purchase Order</DialogTitle>
          <DialogDescription>
            Modify purchase order details for {purchaseOrder.po_number}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po-number">PO Number</Label>
              <Input
                id="po-number"
                value={purchaseOrder.po_number}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-date">Expected Delivery Date</Label>
            <Input
              id="expected-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                <div className="col-span-3">Part SKU</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1">Actions</div>
              </div>

              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                  <div className="col-span-3">
                    <Input
                      placeholder="SKU"
                      value={item.part_sku}
                      onChange={(e) => updateLineItem(item.id, 'part_sku', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Part description"
                      value={item.part_name}
                      onChange={(e) => updateLineItem(item.id, 'part_name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {lineItems.length > 0 && (
                <div className="border-t bg-muted p-3">
                  <div className="text-right font-semibold">
                    Total: EUR {totalAmount.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Purchase Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}