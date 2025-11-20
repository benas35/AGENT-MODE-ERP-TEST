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
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { EditCustomerModal } from "@/components/customers/EditCustomerModal";

const formatAddress = (address: unknown): string | null => {
  if (!address) return null;
  if (typeof address === "string") return address;
  if (typeof address === "object") {
    const { line1, line2, city, state, postal_code } = address as Record<string, string | undefined>;
    const parts = [line1, line2, [city, state].filter(Boolean).join(", "), postal_code].filter(Boolean);
    if (parts.length) {
      return parts.join("\n");
    }
  }
  return null;
};

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { customers, loading, error, refresh } = useCustomers();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return customers;

    return customers.filter((customer) => {
      const targets = [
        `${customer.firstName} ${customer.lastName}`,
        customer.phone ?? "",
        customer.mobile ?? "",
        customer.email ?? ""
      ];

      return targets.some((target) => target.toLowerCase().includes(normalizedSearch));
    });
  }, [customers, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database and contact information.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load customers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" disabled>
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={`customer-skeleton-${index}`} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
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
          {filteredCustomers.map((customer) => {
            const vehicles = customer.vehicles;
            const address = formatAddress(customer.address);

            return (
              <Card key={customer.id} className="hover:shadow-elevated transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {customer.firstName} {customer.lastName}
                    </CardTitle>
                    <Badge variant="secondary">
                      {vehicles.length} {vehicles.length === 1 ? "Vehicle" : "Vehicles"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {(customer.phone || customer.mobile) && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.phone || customer.mobile}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground whitespace-pre-line">{address}</span>
                      </div>
                    )}
                  </div>

                  {vehicles.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Vehicles</span>
                      </div>
                      <div className="space-y-2">
                        {vehicles.slice(0, 2).map((vehicle) => (
                          <div key={vehicle.id} className="text-sm p-2 bg-muted rounded">
                            <p className="font-medium">
                              {vehicle.year ?? ""} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {vehicle.license_plate || "No plate"}
                              {typeof vehicle.mileage === "number" && (
                                <> • {vehicle.mileage.toLocaleString()} mi</>
                              )}
                            </p>
                          </div>
                        ))}
                        {vehicles.length > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{vehicles.length - 2} more vehicles
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Added {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "Recently"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCustomerId(customer.id)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

        {!loading && filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">No customers found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search terms."
                      : "Add your first customer to get started."}
                  </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      <AddCustomerModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onCustomerCreated={refresh}
      />
      <EditCustomerModal
        open={Boolean(editingCustomerId)}
        customerId={editingCustomerId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCustomerId(null);
          }
        }}
        onCustomerUpdated={refresh}
      />
    </div>
  );
}
