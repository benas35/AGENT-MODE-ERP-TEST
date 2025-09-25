import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, FileText } from "lucide-react";

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

interface ViewPOModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  onEdit?: () => void;
}

const mockPOLines = [
  {
    id: "1",
    part_sku: "BRK-PAD-001",
    part_name: "Front Brake Pads - BMW F30",
    quantity: 2,
    unit_price: 89.99,
    line_total: 179.98
  },
  {
    id: "2", 
    part_sku: "OIL-FILT-002",
    part_name: "Oil Filter - Mercedes C-Class",
    quantity: 5,
    unit_price: 24.99,
    line_total: 124.95
  }
];

export function ViewPOModal({ open, onOpenChange, purchaseOrder, onEdit }: ViewPOModalProps) {
  if (!purchaseOrder) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { icon: FileText, variant: "secondary" as const, label: "Draft" };
      case 'sent':
        return { icon: Clock, variant: "default" as const, label: "Sent" };
      case 'confirmed':
        return { icon: CheckCircle, variant: "default" as const, label: "Confirmed" };
      case 'partially_received':
        return { icon: Clock, variant: "secondary" as const, label: "Partially Received" };
      case 'received':
        return { icon: CheckCircle, variant: "default" as const, label: "Received" };
      default:
        return { icon: FileText, variant: "secondary" as const, label: status };
    }
  };

  const statusInfo = getStatusInfo(purchaseOrder.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Order Details</DialogTitle>
          <DialogDescription>
            Complete information for {purchaseOrder.po_number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">PO Number</h3>
                <p className="text-lg font-medium">{purchaseOrder.po_number}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Supplier</h3>
                <p className="text-lg">{purchaseOrder.supplier_name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
                <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Total Amount</h3>
                <p className="text-lg font-medium">{purchaseOrder.currency} {purchaseOrder.total.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">Created Date</h3>
                <p className="text-lg">{purchaseOrder.created_at}</p>
              </div>
              {purchaseOrder.expected_at && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Expected Delivery</h3>
                  <p className="text-lg">{purchaseOrder.expected_at}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Line Items</h3>
            <div className="border rounded-lg">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm">
                <div className="col-span-2">SKU</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-right">Total</div>
              </div>
              
              {mockPOLines.map((line, index) => (
                <div key={line.id}>
                  <div className="grid grid-cols-12 gap-2 p-3 text-sm">
                    <div className="col-span-2 font-medium">{line.part_sku}</div>
                    <div className="col-span-5">{line.part_name}</div>
                    <div className="col-span-2 text-center">{line.quantity}</div>
                    <div className="col-span-2 text-right">{purchaseOrder.currency} {line.unit_price.toFixed(2)}</div>
                    <div className="col-span-1 text-right font-medium">{purchaseOrder.currency} {line.line_total.toFixed(2)}</div>
                  </div>
                  {index < mockPOLines.length - 1 && <Separator />}
                </div>
              ))}
              
              <Separator />
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50">
                <div className="col-span-9"></div>
                <div className="col-span-2 text-right font-medium">Total:</div>
                <div className="col-span-1 text-right font-bold">
                  {purchaseOrder.currency} {purchaseOrder.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              Edit Purchase Order
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}