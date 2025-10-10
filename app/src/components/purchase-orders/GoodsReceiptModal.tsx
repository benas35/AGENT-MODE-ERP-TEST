import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, Scan } from "lucide-react";

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

interface GoodsReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
}

interface ReceiptLine {
  id: string;
  part_sku: string;
  part_name: string;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  lot_no?: string;
  serial_no?: string;
  bin_location?: string;
}

export function GoodsReceiptModal({ open, onOpenChange, purchaseOrder }: GoodsReceiptModalProps) {
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);
  const [grn_number, setGrnNumber] = useState("");
  const [delivery_note, setDeliveryNote] = useState("");
  const [notes, setNotes] = useState("");
  const [partial_receipt, setPartialReceipt] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  // Initialize lines when PO is loaded
  React.useEffect(() => {
    if (purchaseOrder && open) {
      // Mock receipt lines - in real app, fetch from PO API
      setReceiptLines([
        {
          id: "1",
          part_sku: "BRK-PAD-001",
          part_name: "Front Brake Pads - BMW F30",
          ordered_qty: 2,
          received_qty: 2,
          unit_cost: 89.99,
          lot_no: "",
          serial_no: "",
          bin_location: "A1-01"
        },
        {
          id: "2",
          part_sku: "OIL-FILT-002", 
          part_name: "Oil Filter - Mercedes C-Class",
          ordered_qty: 5,
          received_qty: 5,
          unit_cost: 24.99,
          lot_no: "",
          serial_no: "",
          bin_location: "B2-03"
        }
      ]);
      setGrnNumber(`GRN-${Date.now()}`);
    }
  }, [purchaseOrder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseOrder || receiptLines.length === 0) {
      toast({
        title: "Validation Error",
        description: "No items to receive.",
        variant: "destructive"
      });
      return;
    }

    const totalReceived = receiptLines.reduce((sum, line) => sum + line.received_qty, 0);
    if (totalReceived === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter quantities to receive.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement goods receipt API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Goods Receipt Created",
        description: `GRN ${grn_number} has been created successfully.`
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create goods receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReceiptLine = (id: string, field: keyof ReceiptLine, value: any) => {
    setReceiptLines(lines => lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const totalValue = receiptLines.reduce((sum, line) => sum + (line.received_qty * line.unit_cost), 0);

  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goods Receipt (GRN)</DialogTitle>
          <DialogDescription>
            Receive goods for PO {purchaseOrder.po_number} from {purchaseOrder.supplier_name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grn-number">GRN Number</Label>
              <Input
                id="grn-number"
                value={grn_number}
                onChange={(e) => setGrnNumber(e.target.value)}
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-note">Delivery Note #</Label>
              <Input
                id="delivery-note"
                placeholder="Supplier delivery note number"
                value={delivery_note}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox 
                id="partial"
                checked={partial_receipt}
                onCheckedChange={(checked) => setPartialReceipt(checked === true)}
              />
              <Label htmlFor="partial">Partial Receipt</Label>
            </div>
          </div>

          {/* Receipt Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items to Receive</Label>
              <Button type="button" variant="outline" size="sm">
                <Scan className="h-4 w-4 mr-2" />
                Scan Barcode
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                <div className="col-span-2">SKU</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1">Ordered</div>
                <div className="col-span-1">Received</div>
                <div className="col-span-1">Unit Cost</div>
                <div className="col-span-2">Lot/Serial</div>
                <div className="col-span-2">Bin Location</div>
              </div>

              {receiptLines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                  <div className="col-span-2 font-medium text-sm flex items-center">
                    {line.part_sku}
                  </div>
                  <div className="col-span-3 text-sm flex items-center">
                    {line.part_name}
                  </div>
                  <div className="col-span-1 text-center flex items-center justify-center">
                    {line.ordered_qty}
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.received_qty}
                      onChange={(e) => updateReceiptLine(line.id, 'received_qty', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-1 text-sm flex items-center justify-center">
                    €{line.unit_cost.toFixed(2)}
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Lot/Serial"
                      value={line.lot_no || ''}
                      onChange={(e) => updateReceiptLine(line.id, 'lot_no', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Bin"
                      value={line.bin_location || ''}
                      onChange={(e) => updateReceiptLine(line.id, 'bin_location', e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
              ))}

              <div className="border-t bg-muted p-3">
                <div className="text-right font-semibold">
                  Receipt Total: €{totalValue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Receipt Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this receipt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
              {loading ? "Processing Receipt..." : "Process Receipt"}
              <Package className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}