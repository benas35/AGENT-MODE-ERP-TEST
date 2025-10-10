import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  FileText, 
  DollarSign,
  Calendar,
  Eye,
  Edit,
  Send,
  Archive
} from "lucide-react";
import { EstimateWithDetails, EstimateStatus } from "@/types/database";
import { useEstimates } from "@/hooks/useEstimates";

export default function Estimates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const { estimates, loading, error, createEstimate } = useEstimates({
    search: searchQuery,
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const getStatusColor = (status: EstimateStatus): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SENT': return 'default';
      case 'APPROVED': return 'default';
      case 'DECLINED': return 'destructive';
      case 'EXPIRED': return 'outline';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading estimates: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground">Create and manage service estimates for your customers.</p>
        </div>
        <Button onClick={() => createEstimate()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Estimate
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimates.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                estimates
                  .filter(e => e.status === 'SENT')
                  .reduce((sum, e) => sum + (e.total || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimates.filter(e => e.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimates.length > 0 
                ? Math.round((estimates.filter(e => e.status === 'APPROVED').length / estimates.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search estimates by number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | "all")}
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Declined</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Estimates List */}
      {loading ? (
        <div className="text-center text-muted-foreground">Loading estimates...</div>
      ) : (
        <div className="space-y-4">
          {estimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-elevated transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{estimate.estimate_number}</h3>
                      <Badge variant={getStatusColor(estimate.status || 'DRAFT')}>
                        {estimate.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Customer: {estimate.customer?.first_name} {estimate.customer?.last_name}
                    </div>
                    {estimate.vehicle && (
                      <div className="text-sm text-muted-foreground">
                        Vehicle: {estimate.vehicle.year} {estimate.vehicle.make} {estimate.vehicle.model}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Created: {formatDate(estimate.created_at || '')}
                      {estimate.expires_at && (
                        <> • Expires: {formatDate(estimate.expires_at.toString())}</>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(estimate.total || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {estimate.estimate_items?.length || 0} items
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {estimate.status === 'DRAFT' && (
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {estimate.status === 'APPROVED' && (
                        <Button size="sm">
                          Convert to Work Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {estimates.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No estimates found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first estimate.
                </p>
                <Button onClick={() => createEstimate()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Estimate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}