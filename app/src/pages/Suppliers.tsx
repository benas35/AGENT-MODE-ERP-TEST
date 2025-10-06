import { useState } from "react";
import { Plus, Search, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddSupplierModal } from "@/components/suppliers/AddSupplierModal";
import { EditSupplierModal } from "@/components/suppliers/EditSupplierModal";
import { ViewSupplierModal } from "@/components/suppliers/ViewSupplierModal";
import { ImportSuppliersModal } from "@/components/suppliers/ImportSuppliersModal";
import { CreatePOModal } from "@/components/purchase-orders/CreatePOModal";
import { useSuppliers, type Supplier } from "@/hooks/useSuppliers";

// Create extended interface for display suppliers that includes UI properties
interface DisplaySupplier extends Supplier {
  performance?: {
    total_orders: number;
    on_time_delivery: number;
    avg_lead_time: number;
  };
}

const mockSuppliers: DisplaySupplier[] = [
  {
    id: "1",
    name: "BMW Parts Direct",
    code: "BMW001",
    email: "orders@bmwpartsdirect.com",
    phone: "+49 30 1234567",
    vat_id: "DE123456789",
    currency: "EUR",
    payment_terms: "NET30",
    lead_time_days: 5,
    active: true,
    org_id: "1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    address: {
      street: "Motorstraße 123",
      city: "Munich",
      country: "Germany"
    },
    performance: {
      total_orders: 45,
      on_time_delivery: 95,
      avg_lead_time: 4.2
    }
  },
  {
    id: "2",
    name: "Mercedes Genuine Parts",
    code: "MB002",
    email: "supply@mercedes-parts.de",
    phone: "+49 711 987654",
    vat_id: "DE987654321",
    currency: "EUR", 
    payment_terms: "NET15",
    lead_time_days: 3,
    active: true,
    org_id: "1",
    created_at: "2024-01-01",  
    updated_at: "2024-01-01",
    address: {
      street: "Daimlerstraße 456",
      city: "Stuttgart",
      country: "Germany"
    },
    performance: {
      total_orders: 62,
      on_time_delivery: 98,
      avg_lead_time: 2.8
    }
  },
  {
    id: "3",
    name: "Universal Auto Supply",
    code: "UAS003",
    email: "orders@universalauto.eu",
    phone: "+31 20 555666",
    vat_id: "NL555666777",
    currency: "EUR",
    payment_terms: "NET45",
    lead_time_days: 7,
    active: true,
    org_id: "1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    address: {
      street: "Industrieweg 789",
      city: "Amsterdam",
      country: "Netherlands"
    },
    performance: {
      total_orders: 28,
      on_time_delivery: 89,
      avg_lead_time: 6.5
    }
  }
];

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [editSupplierOpen, setEditSupplierOpen] = useState(false);
  const [viewSupplierOpen, setViewSupplierOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createPOOpen, setCreatePOOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<DisplaySupplier | null>(null);

  const { suppliers } = useSuppliers();
  
  // Use real suppliers data or fallback to mock data with proper typing
  const displaySuppliers = suppliers.length > 0 ? (suppliers as DisplaySupplier[]) : mockSuppliers;

  const filteredSuppliers = displaySuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const totalSuppliers = displaySuppliers.length;
  const activeSuppliers = displaySuppliers.filter(s => s.active).length;
  const avgOnTimeDelivery = displaySuppliers.reduce((sum, s) => sum + (s.performance?.on_time_delivery || 0), 0) / displaySuppliers.length;
  const avgLeadTime = displaySuppliers.reduce((sum, s) => sum + s.lead_time_days, 0) / displaySuppliers.length;

  const getSupplierInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 95) return "text-green-600";
    if (percentage >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">
            Manage your supplier relationships and performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setAddSupplierOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {activeSuppliers} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOnTimeDelivery.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average performance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLeadTime.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Days average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(displaySuppliers.map(s => s.address?.country).filter(Boolean))).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Supplier countries
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            Manage supplier information and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name, code, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="border rounded-lg p-6 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getSupplierInitials(supplier.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{supplier.name}</h3>
                        {supplier.code && (
                          <Badge variant="outline">{supplier.code}</Badge>
                        )}
                        <Badge variant={supplier.active ? "default" : "secondary"}>
                          {supplier.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.email || "No email"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.phone || "No phone"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.address?.city || "No address"}, {supplier.address?.country || ""}</span>
                        </div>
                        <div>
                          <span className="font-medium">VAT ID:</span> {supplier.vat_id || "N/A"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Currency:</span> {supplier.currency}
                        </div>
                        <div>
                          <span className="font-medium">Payment Terms:</span> {supplier.payment_terms}
                        </div>
                        <div>
                          <span className="font-medium">Lead Time:</span> {supplier.lead_time_days} days
                        </div>
                        <div>
                          <span className="font-medium">Total Orders:</span> {supplier.performance?.total_orders || 0}
                        </div>
                      </div>

                      {supplier.performance && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">On-Time Delivery:</span>{" "}
                            <span className={getPerformanceColor(supplier.performance.on_time_delivery)}>
                              {supplier.performance.on_time_delivery}%
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Avg Lead Time:</span> {supplier.performance.avg_lead_time} days
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setViewSupplierOpen(true);
                      }}
                    >
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setEditSupplierOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setCreatePOOpen(true);
                      }}
                    >
                      New PO
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No suppliers found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or add a new supplier.
              </p>
              <div className="mt-6">
                <Button onClick={() => setAddSupplierOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddSupplierModal 
        open={addSupplierOpen} 
        onOpenChange={setAddSupplierOpen} 
      />
      
      <EditSupplierModal 
        open={editSupplierOpen} 
        onOpenChange={setEditSupplierOpen}
        supplier={selectedSupplier}
      />
      
      <ViewSupplierModal 
        open={viewSupplierOpen} 
        onOpenChange={setViewSupplierOpen}
        supplier={selectedSupplier}
        onEdit={() => {
          setViewSupplierOpen(false);
          setEditSupplierOpen(true);
        }}
      />
      
      <ImportSuppliersModal 
        open={importOpen} 
        onOpenChange={setImportOpen}
      />
      
      <CreatePOModal 
        open={createPOOpen} 
        onOpenChange={setCreatePOOpen}
      />
    </div>
  );
}