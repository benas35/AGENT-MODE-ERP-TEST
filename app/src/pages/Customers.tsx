import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin,
  Car,
  Calendar
} from "lucide-react";
import { mockCustomers, mockVehicles } from "@/data/mockData";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerVehicles = (customerId: string) => {
    return mockVehicles.filter(vehicle => vehicle.customerId === customerId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database and contact information.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

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
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
          const vehicles = getCustomerVehicles(customer.id);
          
          return (
            <Card key={customer.id} className="hover:shadow-elevated transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <Badge variant="secondary">
                    {vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{customer.address}</span>
                  </div>
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
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {vehicle.licensePlate} • {vehicle.mileage.toLocaleString()} mi
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
                    <span>Added {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No customers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms." : "Add your first customer to get started."}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}