import { useState } from "react";
import { Plus, Search, Package, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddPartModal } from "@/components/parts/AddPartModal";
import { EditPartModal } from "@/components/parts/EditPartModal";
import { ViewPartModal } from "@/components/parts/ViewPartModal";
import { StockAdjustmentModal } from "@/components/parts/StockAdjustmentModal";
import { TransferModal } from "@/components/parts/TransferModal";
import { QualityInspectionModal } from "@/components/parts/QualityInspectionModal";
import { SerialLotTrackingModal } from "@/components/parts/SerialLotTrackingModal";
import { ReturnToSupplierModal } from "@/components/parts/ReturnToSupplierModal";
import { useParts, type Part } from "@/hooks/useParts";

// Create extended interface for display parts that includes UI properties
interface DisplayPart extends Part {
  category?: string;
  qty_on_hand?: number;
  cost?: number;
  price?: number;
}

const mockParts: DisplayPart[] = [
  {
    id: "1",
    sku: "BRK-PAD-001",
    part_no: "BP-F30-001",
    name: "Front Brake Pads - BMW F30",
    description: "Premium ceramic brake pads for BMW F30 series",
    brand: "Brembo",
    category: "Brakes",
    uom: "set", 
    cost: 45.50,
    price: 89.99,
    qty_on_hand: 12,
    min_stock: 5,
    max_stock: 25,
    reorder_point: 8,
    active: true,
    org_id: "1",
    is_serialized: false,
    track_lot: false,
    cost_method: "average",
    attributes: {},
    reorder_qty: 10,
    created_at: "2024-01-01",
    updated_at: "2024-01-01"
  },
  {
    id: "2",
    sku: "OIL-FILT-002",
    part_no: "OF-MB-002", 
    name: "Oil Filter - Mercedes C-Class",
    description: "OEM oil filter for Mercedes C-Class W205",
    brand: "Mann",
    category: "Filters",
    uom: "ea",
    cost: 12.30,
    price: 24.99,
    qty_on_hand: 3,
    min_stock: 10,
    max_stock: 50,
    reorder_point: 15,
    active: true,
    org_id: "1",
    is_serialized: false,
    track_lot: false,
    cost_method: "average",
    attributes: {},
    reorder_qty: 20,
    created_at: "2024-01-01",
    updated_at: "2024-01-01"
  }
];

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  
  // Modal states
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [viewPartOpen, setViewPartOpen] = useState(false);  
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<DisplayPart | null>(null);

  const { parts, loading } = useParts();
  
  // Use real parts data or fallback to mock data with proper typing
  const displayParts = parts.length > 0 ? (parts as DisplayPart[]) : mockParts;

  const filteredParts = displayParts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.part_no.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
    
    const matchesStock = stockFilter === "all" ||
                        (stockFilter === "low" && part.qty_on_hand !== undefined && part.reorder_point !== undefined && part.qty_on_hand <= part.reorder_point) ||
                        (stockFilter === "out" && part.qty_on_hand === 0) ||
                        (stockFilter === "in" && part.qty_on_hand !== undefined && part.qty_on_hand > 0);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = Array.from(new Set(displayParts.map(part => part.category).filter(Boolean)));
  const totalParts = displayParts.length;
  const lowStockParts = displayParts.filter(part => 
    part.qty_on_hand !== undefined && part.reorder_point !== undefined && part.qty_on_hand <= part.reorder_point
  ).length;
  const totalValue = displayParts.reduce((sum, part) => sum + ((part.qty_on_hand || 0) * (part.cost || 0)), 0);

  const getStockStatus = (part: DisplayPart) => {
    if (part.qty_on_hand === 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (part.qty_on_hand !== undefined && part.reorder_point !== undefined && part.qty_on_hand <= part.reorder_point) {
      return { status: "Low Stock", variant: "secondary" as const };
    }
    return { status: "In Stock", variant: "default" as const };
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Parts & Inventory</h2>
          <p className="text-muted-foreground">
            Manage your parts catalog and inventory levels
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => alert("Reports feature coming soon!")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button onClick={() => setAddPartOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Part
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParts}</div>
            <p className="text-xs text-muted-foreground">
              Active parts in catalog
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockParts}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Product categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="parts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="parts">Parts Catalog</TabsTrigger>
          <TabsTrigger value="adjustments">Stock Adjustments</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts Catalog</CardTitle>
              <CardDescription>
                Manage your complete parts inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts by name, SKU, or part number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {lowStockParts > 0 && (
                <div className="mb-6 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="font-medium text-orange-700">Low Stock Alert</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">
                    {lowStockParts} parts are below their reorder point and need restocking.
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {filteredParts.map((part) => {
                  const stockStatus = getStockStatus(part);
                  const margin = part.cost && part.price ? ((part.price - part.cost) / part.price * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={part.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{part.name}</h3>
                            <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                            {part.brand && (
                              <Badge variant="outline">{part.brand}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">SKU:</span> {part.sku}
                            </div>
                            <div>
                              <span className="font-medium">Part #:</span> {part.part_no}
                            </div>
                            <div>
                              <span className="font-medium">Category:</span> {part.category || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">UOM:</span> {part.uom}
                            </div>
                            <div>
                              <span className="font-medium">On Hand:</span> {part.qty_on_hand || 0} {part.uom}
                            </div>
                            <div>
                              <span className="font-medium">Cost:</span> €{part.cost?.toFixed(2) || '0.00'}
                            </div>
                            <div>
                              <span className="font-medium">Price:</span> €{part.price?.toFixed(2) || '0.00'}
                            </div>
                            <div>
                              <span className="font-medium">Margin:</span> {margin}%
                            </div>
                          </div>
                          {part.description && (
                            <p className="text-sm text-muted-foreground">{part.description}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPart(part);
                              setViewPartOpen(true);
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPart(part);
                              setEditPartOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {stockStatus.status === "Low Stock" && (
                            <Button 
                              size="sm"
                              onClick={() => alert("Reorder functionality coming soon!")}
                            >
                              Reorder
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredParts.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No parts found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your search or filters, or add a new part.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setAddPartOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Part
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle>Stock Adjustments</CardTitle>
              <CardDescription>
                Adjust inventory quantities for cycle counts, damage, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No adjustments found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create stock adjustments to correct inventory discrepancies.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setAdjustmentOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Adjustment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Inter-Branch Transfers</CardTitle>
              <CardDescription>
                Transfer inventory between locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No transfers found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create transfers to move inventory between branches.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setTransferOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Transfer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddPartModal 
        open={addPartOpen} 
        onOpenChange={setAddPartOpen} 
      />
      
      <EditPartModal 
        open={editPartOpen} 
        onOpenChange={setEditPartOpen}
        part={selectedPart}
      />
      
      <ViewPartModal 
        open={viewPartOpen} 
        onOpenChange={setViewPartOpen}
        part={selectedPart}
        onEdit={() => {
          setViewPartOpen(false);
          setEditPartOpen(true);
        }}
      />
      
      <StockAdjustmentModal 
        open={adjustmentOpen} 
        onOpenChange={setAdjustmentOpen}
      />
      
      <TransferModal 
        open={transferOpen} 
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}