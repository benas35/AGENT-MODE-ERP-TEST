import { useState } from "react";
import { createRouteErrorBoundary } from "@/app/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Car,
  User,
  Calendar,
  Gauge,
  FileText,
  Eye,
  Edit,
  Images
} from "lucide-react";
import { mockVehicles, mockCustomers, getCustomerById } from "@/data/mockData";
import { VehiclePhotoGallery } from "@/components/vehicles/VehiclePhotoGallery";
import { VehicleMediaPreview } from "@/features/vehicle-media/VehicleMediaPreview";

export default function Vehicles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaVehicleId, setMediaVehicleId] = useState<string | null>(null);

  const filteredVehicles = mockVehicles.filter(vehicle => {
    const customer = getCustomerById(vehicle.customerId);
    return vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
           vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
           vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
           vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
           customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">Manage vehicle information and service history.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by make, model, license plate, VIN, or owner name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const customer = getCustomerById(vehicle.customerId);

          return (
            <Card key={vehicle.id} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </CardTitle>
                    <Badge variant="outline">{vehicle.color}</Badge>
                  </div>
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Recent vehicle photos</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => setMediaVehicleId(vehicle.id)}
                    >
                      <Images className="mr-2 h-4 w-4" />
                      Manage media
                    </Button>
                  </div>
                  <VehicleMediaPreview vehicleId={vehicle.id} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">License Plate</p>
                    <p className="font-medium">{vehicle.licensePlate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      Mileage
                    </p>
                    <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">VIN</p>
                  <p className="font-mono text-xs bg-muted p-2 rounded border">
                    {vehicle.vin}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{customer?.name}</p>
                      <p className="text-muted-foreground">{customer?.phone}</p>
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
                  <Button size="sm">
                    <FileText className="w-4 h-4 mr-1" />
                    Service History
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No vehicles found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms." : "Add your first vehicle to get started."}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VehiclePhotoGallery
        vehicleId={mediaVehicleId ?? ""}
        open={!!mediaVehicleId}
        onOpenChange={(open) => !open && setMediaVehicleId(null)}
      />
    </div>
  );
}

export const ErrorBoundary = createRouteErrorBoundary("Vehicles");
