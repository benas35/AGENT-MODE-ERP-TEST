import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Receipt, 
  DollarSign,
  Calendar,
  Eye,
  Edit,
  Send,
  Download,
  CreditCard
} from "lucide-react";
import { InvoiceWithDetails, InvoiceStatus } from "@/types/database";
import { useInvoices } from "@/hooks/useInvoices";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const { invoices, loading, error, createInvoice } = useInvoices({
    search: searchQuery,
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const getStatusColor = (status: InvoiceStatus): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SENT': return 'default';
      case 'PAID': return 'default';
      case 'OVERDUE': return 'destructive';
      case 'CANCELLED': return 'outline';
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

  const getPaymentStatus = (invoice: InvoiceWithDetails) => {
    const totalPaid = invoice.payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    const total = invoice.total || 0;
    
    if (totalPaid === 0) return 'Unpaid';
    if (totalPaid >= total) return 'Paid';
    return `Partial (${formatCurrency(totalPaid)})`;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading invoices: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and track payments.</p>
        </div>
        <Button onClick={() => createInvoice()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                invoices
                  .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED')
                  .reduce((sum, i) => sum + ((i.balance_due || i.total) || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter(i => i.status === 'OVERDUE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                invoices
                  .filter(i => {
                    const invoiceDate = new Date(i.created_at || '');
                    const now = new Date();
                    return invoiceDate.getMonth() === now.getMonth() && 
                           invoiceDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, i) => sum + (i.total || 0), 0)
              )}
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
                placeholder="Search invoices by number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "all")}
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {loading ? (
        <div className="text-center text-muted-foreground">Loading invoices...</div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-elevated transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
                      <Badge variant={getStatusColor(invoice.status || 'DRAFT')}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Customer: {invoice.customer?.first_name} {invoice.customer?.last_name}
                    </div>
                    {invoice.vehicle && (
                      <div className="text-sm text-muted-foreground">
                        Vehicle: {invoice.vehicle.year} {invoice.vehicle.make} {invoice.vehicle.model}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Created: {formatDate(invoice.created_at || '')}
                      {invoice.due_at && (
                        <> • Due: {formatDate(invoice.due_at.toString())}</>
                      )}
                    </div>
                    <div className="text-sm">
                      Payment: <span className={`font-medium ${
                        getPaymentStatus(invoice) === 'Paid' ? 'text-success' : 
                        getPaymentStatus(invoice).startsWith('Partial') ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        {getPaymentStatus(invoice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(invoice.total || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.invoice_items?.length || 0} items
                      </div>
                      {invoice.balance_due && invoice.balance_due > 0 && (
                        <div className="text-sm text-warning">
                          Balance: {formatCurrency(invoice.balance_due)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'DRAFT' && (
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                        <Button size="sm">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {invoices.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first invoice.
                </p>
                <Button onClick={() => createInvoice()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}