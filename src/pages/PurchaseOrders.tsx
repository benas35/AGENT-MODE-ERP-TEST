import { useState } from "react";
import { Plus, Search, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatePOModal } from "@/components/purchase-orders/CreatePOModal";
import { ViewPOModal } from "@/components/purchase-orders/ViewPOModal";
import { EditPOModal } from "@/components/purchase-orders/EditPOModal";
import { GoodsReceiptModal } from "@/components/purchase-orders/GoodsReceiptModal";
import { ThreeWayMatchModal } from "@/components/purchase-orders/ThreeWayMatchModal";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  total: number;
  currency: string;
  expected_at?: string;
  created_at: string;
  line_count: number;
}

const mockPOs: PurchaseOrder[] = [
  {
    id: "1",
    po_number: "PO-2024-0001",
    supplier_name: "BMW Parts Direct",
    status: "confirmed",
    total: 1250.00,
    currency: "EUR",
    expected_at: "2024-01-15",
    created_at: "2024-01-10",
    line_count: 5
  },
  {
    id: "2", 
    po_number: "PO-2024-0002",
    supplier_name: "Mercedes Genuine Parts",
    status: "partially_received",
    total: 890.50,
    currency: "EUR",
    expected_at: "2024-01-12",
    created_at: "2024-01-08",
    line_count: 3
  },
  {
    id: "3",
    po_number: "PO-2024-0003",
    supplier_name: "Universal Auto Supply",
    status: "draft",
    total: 456.75,
    currency: "EUR",
    created_at: "2024-01-11",
    line_count: 2
  }
];

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Modal states
  const [createPOOpen, setCreatePOOpen] = useState(false);
  const [viewPOOpen, setViewPOOpen] = useState(false);
  const [editPOOpen, setEditPOOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filteredPOs = mockPOs.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    
    const matchesSupplier = supplierFilter === "all" || po.supplier_name === supplierFilter;

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const suppliers = Array.from(new Set(mockPOs.map(po => po.supplier_name).filter(s => s && s.trim() !== '')));
  const totalPOs = mockPOs.length;
  const pendingPOs = mockPOs.filter(po => ['sent', 'confirmed', 'partially_received'].includes(po.status)).length;
  const totalValue = mockPOs.reduce((sum, po) => sum + po.total, 0);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { icon: FileText, variant: "secondary" as const, label: "Draft" };
      case 'sent':
        return { icon: Clock, variant: "default" as const, label: "Sent" };
      case 'confirmed':
        return { icon: CheckCircle, variant: "default" as const, label: "Confirmed" };
      case 'partially_received':
        return { icon: AlertCircle, variant: "secondary" as const, label: "Partially Received" };
      case 'received':
        return { icon: CheckCircle, variant: "default" as const, label: "Received" };
      case 'closed':
        return { icon: CheckCircle, variant: "outline" as const, label: "Closed" };
      case 'cancelled':
        return { icon: AlertCircle, variant: "destructive" as const, label: "Cancelled" };
      default:
        return { icon: FileText, variant: "secondary" as const, label: status };
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage purchase orders and supplier deliveries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => alert("Reports feature coming soon!")}>
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button onClick={() => setCreatePOOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPOs}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current month orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPOs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
          <TabsTrigger value="matching">3-Way Match</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                View and manage all purchase orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by PO number or supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="partially_received">Partially Received</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.filter(supplier => supplier && supplier.trim() !== '').map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredPOs.map((po) => {
                  const statusInfo = getStatusInfo(po.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={po.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{po.po_number}</h3>
                            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Supplier:</span> {po.supplier_name}
                            </div>
                            <div>
                              <span className="font-medium">Total:</span> {po.currency} {po.total.toFixed(2)}
                            </div>
                            <div>
                              <span className="font-medium">Lines:</span> {po.line_count}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {po.created_at}
                            </div>
                            {po.expected_at && (
                              <div>
                                <span className="font-medium">Expected:</span> {po.expected_at}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po);
                              setViewPOOpen(true);
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po);
                              setEditPOOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {po.status === 'confirmed' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po);
                                setReceiptOpen(true);
                              }}
                            >
                              Receive
                            </Button>
                          )}
                          {po.status === 'draft' && (
                            <Button 
                              size="sm"
                              onClick={() => alert("Send PO functionality coming soon!")}
                            >
                              Send
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredPOs.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No purchase orders found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your search or filters, or create a new PO.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setCreatePOOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Purchase Order
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipt (GRN)</CardTitle>
              <CardDescription>
                Receive goods and update inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No pending receipts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  All confirmed orders have been received.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching">
          <Card>
            <CardHeader>
              <CardTitle>3-Way Match</CardTitle>
              <CardDescription>
                Match purchase orders, receipts, and supplier invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No matches pending</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  All supplier invoices have been matched and processed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreatePOModal 
        open={createPOOpen} 
        onOpenChange={setCreatePOOpen} 
      />
      
      <ViewPOModal 
        open={viewPOOpen} 
        onOpenChange={setViewPOOpen}
        purchaseOrder={selectedPO}
        onEdit={() => {
          setViewPOOpen(false);
          setEditPOOpen(true);
        }}
      />
      
      <EditPOModal 
        open={editPOOpen} 
        onOpenChange={setEditPOOpen}
        purchaseOrder={selectedPO}
      />
      
      <GoodsReceiptModal 
        open={receiptOpen} 
        onOpenChange={setReceiptOpen}
        purchaseOrder={selectedPO}
      />
    </div>
  );
}