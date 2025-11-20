import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useParts } from "@/hooks/useParts";

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
}).format(value);

const extractPricing = (attributes: any) => {
  if (!attributes || typeof attributes !== "object") return { cost: null, price: null };
  const pricing = (attributes as Record<string, any>).pricing ?? attributes;
  const cost = typeof pricing?.cost === "number" ? pricing.cost : null;
  const price = typeof pricing?.price === "number" ? pricing.price : null;
  return { cost, price };
};

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const {
    parts,
    categories,
    inventory,
    loading,
    error,
    getLowStockParts,
  } = useParts({ include_inventory: true });

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const inventorySummary = useMemo(() => {
    const summary = new Map<string, { quantity: number; value: number }>();

    inventory.forEach((entry) => {
      const existing = summary.get(entry.part_id) ?? { quantity: 0, value: 0 };
      existing.quantity += entry.qty_on_hand ?? 0;
      existing.value += entry.total_value ?? 0;
      summary.set(entry.part_id, existing);
    });

    return summary;
  }, [inventory]);

  const filteredParts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return parts.filter((part) => {
      if (categoryFilter !== "all" && part.category_id !== categoryFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const targets = [
        part.name,
        part.sku,
        part.part_no,
        part.description ?? "",
      ];

      return targets.some((target) => target.toLowerCase().includes(normalizedSearch));
    });
  }, [parts, searchQuery, categoryFilter]);

  const totalInventoryMetrics = useMemo(() => {
    let totalQuantity = 0;
    let totalValue = 0;

    parts.forEach((part) => {
      const summary = inventorySummary.get(part.id);
      if (summary) {
        totalQuantity += summary.quantity;
        totalValue += summary.value;
      }
    });

    return { totalQuantity, totalValue };
  }, [parts, inventorySummary]);

  const lowStockParts = useMemo(() => {
    if (!parts.length) return [] as typeof parts;
    return getLowStockParts();
  }, [parts, getLowStockParts]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your parts, supplies, and stock levels.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load inventory</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalInventoryMetrics.totalQuantity.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {parts.length} unique parts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalInventoryMetrics.totalValue)}</div>
            )}
            <p className="text-xs text-muted-foreground">At cost value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-warning">{lowStockParts.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{categories.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Product categories</p>
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
                placeholder="Search by name, SKU, or description..."
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {!loading && lowStockParts.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockParts.slice(0, 6).map((part) => {
                const summary = inventorySummary.get(part.id);
                const onHand = summary?.quantity ?? 0;
                const reorderPoint = part.reorder_point ?? 0;
                const reorderQty = Math.max(reorderPoint - onHand, part.reorder_qty ?? 0);

                return (
                  <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg bg-warning/10">
                    <div>
                      <p className="font-medium">{part.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {part.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{onHand} left</p>
                      <p className="text-xs text-muted-foreground">Order {reorderQty}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {lowStockParts.length > 6 && (
              <p className="text-sm text-muted-foreground mt-4">
                +{lowStockParts.length - 6} more items need attention
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={`inventory-skeleton-${index}`} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParts.map((part) => {
            const summary = inventorySummary.get(part.id);
            const quantityOnHand = summary?.quantity ?? 0;
            const totalValue = summary?.value ?? 0;
            const { cost, price } = extractPricing(part.attributes);
            const margin = cost && price ? ((price - cost) / cost) * 100 : null;
            const categoryName = part.category_id ? categoryMap.get(part.category_id) ?? "Uncategorized" : "Uncategorized";

            return (
              <Card key={part.id} className="hover:shadow-elevated transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{part.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{categoryName}</Badge>
                        <Badge variant="secondary">SKU: {part.sku}</Badge>
                      </div>
                    </div>
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">On Hand</p>
                      <p className="font-medium">{quantityOnHand}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Value</p>
                      <p className="font-medium">{formatCurrency(totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{cost ? formatCurrency(cost) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">{price ? formatCurrency(price) : "—"}</p>
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                    {part.description || "No description provided."}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reorder Point</p>
                      <p className="font-medium">{part.reorder_point}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reorder Qty</p>
                      <p className="font-medium">{part.reorder_qty}</p>
                    </div>
                    {margin !== null && (
                      <div>
                        <p className="text-muted-foreground">Margin</p>
                        <p className="font-medium">
                          {margin > 0 ? (
                            <span className="text-success">{margin.toFixed(1)}%</span>
                          ) : (
                            <span className="text-destructive">{margin.toFixed(1)}%</span>
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">
                        {quantityOnHand <= 0
                          ? "Out of Stock"
                          : quantityOnHand <= (part.reorder_point ?? 0)
                            ? "Low Stock"
                            : "In Stock"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled title="View coming soon">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" disabled title="Editing coming soon">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {quantityOnHand <= (part.reorder_point ?? 0) ? (
                        <TrendingDown className="h-4 w-4 text-warning" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-success" />
                      )}
                      <span>{quantityOnHand <= (part.reorder_point ?? 0) ? "Reorder recommended" : "Stock healthy"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
