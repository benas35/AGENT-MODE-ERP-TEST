import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Edit,
  Eye,
  DollarSign,
  BarChart3
} from "lucide-react";
import { mockInventory, InventoryItem } from "@/data/mockData";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredItems = mockInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(mockInventory.map(item => item.category))];
  const lowStockItems = mockInventory.filter(item => item.quantity <= item.reorderPoint);
  
  const totalValue = mockInventory.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const totalItems = mockInventory.reduce((sum, item) => sum + item.quantity, 0);

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { status: 'out-of-stock', color: 'bg-destructive text-destructive-foreground', label: 'Out of Stock' };
    } else if (item.quantity <= item.reorderPoint) {
      return { status: 'low-stock', color: 'bg-warning text-warning-foreground', label: 'Low Stock' };
    } else {
      return { status: 'in-stock', color: 'bg-success text-success-foreground', label: 'In Stock' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your parts, supplies, and stock levels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mockInventory.length} unique parts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              At cost value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockItems.length}</div>
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-warning/10">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{item.quantity} left</p>
                    <p className="text-xs text-muted-foreground">Need {item.reorderPoint - item.quantity + 10}</p>
                  </div>
                </div>
              ))}
            </div>
            {lowStockItems.length > 6 && (
              <p className="text-sm text-muted-foreground mt-4">
                +{lowStockItems.length - 6} more items need attention
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const stockStatus = getStockStatus(item);
          const markup = ((item.price - item.cost) / item.cost * 100).toFixed(1);
          
          return (
            <Card key={item.id} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge className={stockStatus.color}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">SKU</p>
                    <p className="font-medium">{item.sku}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{item.supplier}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-bold text-lg">{item.quantity}</p>
                    <p className="text-xs text-muted-foreground">Reorder at {item.reorderPoint}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Value</p>
                    <p className="font-medium">${(item.quantity * item.cost).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">at cost</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">${item.cost}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">${item.price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Markup</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{markup}%</p>
                        {parseFloat(markup) > 50 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-warning" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  {item.quantity <= item.reorderPoint && (
                    <Button size="sm">
                      Reorder
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No items found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms or filters." : "Add your first inventory item to get started."}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Inventory Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}