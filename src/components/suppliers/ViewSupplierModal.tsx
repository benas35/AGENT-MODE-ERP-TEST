import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone, MapPin, CreditCard, Calendar, TrendingUp } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  vat_id?: string;
  currency: string;
  payment_terms: string;
  lead_time_days: number;
  active: boolean;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  performance?: {
    total_orders: number;
    on_time_delivery: number;
    avg_lead_time: number;
  };
}

interface ViewSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onEdit?: () => void;
}

export function ViewSupplierModal({ open, onOpenChange, supplier, onEdit }: ViewSupplierModalProps) {
  if (!supplier) return null;

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 95) return "text-green-600";
    if (percentage >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  const mockRecentOrders = [
    { po_number: "PO-2024-0001", date: "2024-01-10", amount: 1250.00, status: "Delivered" },
    { po_number: "PO-2024-0002", date: "2024-01-08", amount: 890.50, status: "In Transit" },
    { po_number: "PO-2023-0156", date: "2023-12-22", amount: 567.25, status: "Delivered" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
          <DialogDescription>
            Complete information for {supplier.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier Name</p>
                  <p className="font-medium">{supplier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier Code</p>
                  <p className="font-medium">{supplier.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VAT ID</p>
                  <p className="font-medium">{supplier.vat_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={supplier.active ? "default" : "secondary"}>
                    {supplier.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{supplier.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{supplier.payment_terms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lead Time</p>
                  <p className="font-medium">{supplier.lead_time_days} days</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{supplier.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{supplier.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    {supplier.address ? (
                      <div>
                        {supplier.address.street && <p className="font-medium">{supplier.address.street}</p>}
                        {supplier.address.city && <p className="font-medium">{supplier.address.city}</p>}
                        {supplier.address.country && <p className="font-medium">{supplier.address.country}</p>}
                      </div>
                    ) : (
                      <p className="font-medium">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance Metrics */}
          {supplier.performance && (
            <>
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{supplier.performance.total_orders}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className={`text-2xl font-bold ${getPerformanceColor(supplier.performance.on_time_delivery)}`}>
                      {supplier.performance.on_time_delivery}%
                    </p>
                    <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{supplier.performance.avg_lead_time}</p>
                    <p className="text-sm text-muted-foreground">Avg Lead Time (days)</p>
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Recent Orders */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Orders
            </h3>
            <div className="border rounded-lg">
              <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 font-medium text-sm">
                <div>PO Number</div>
                <div>Date</div>
                <div>Amount</div>
                <div>Status</div>
              </div>
              
              {mockRecentOrders.map((order, index) => (
                <div key={order.po_number}>
                  <div className="grid grid-cols-4 gap-2 p-3 text-sm">
                    <div className="font-medium">{order.po_number}</div>
                    <div>{order.date}</div>
                    <div>€{order.amount.toFixed(2)}</div>
                    <div>
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  {index < mockRecentOrders.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              Edit Supplier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}