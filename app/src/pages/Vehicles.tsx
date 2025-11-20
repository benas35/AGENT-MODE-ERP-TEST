import { useMemo, useState } from "react";
import { createRouteErrorBoundary } from "@/app/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  Plus,
  Car as CarIcon,
  User,
  Gauge,
  FileText,
  Eye,
  Edit,
  Images
} from "lucide-react";
import { VehiclePhotoGallery } from "@/components/vehicles/VehiclePhotoGallery";
import { VehicleMediaPreview } from "@/features/vehicle-media/VehicleMediaPreview";
import { useVehicles } from "@/hooks/useVehicles";
import { AddVehicleModal } from "@/components/vehicles/AddVehicleModal";
import { EditVehicleModal } from "@/components/vehicles/EditVehicleModal";

const formatVehicleTitle = (vehicle: ReturnType<typeof useVehicles>["vehicles"][number]) => {
  const year = vehicle.year ? `${vehicle.year} ` : "";
  return `${year}${vehicle.make} ${vehicle.model}`.trim();
};

export default function Vehicles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaVehicleId, setMediaVehicleId] = useState<string | null>(null);
  const { vehicles, loading, error, refresh } = useVehicles();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return vehicles;

    return vehicles.filter((vehicle) => {
      const customerName = vehicle.customer
        ? `${vehicle.customer.firstName} ${vehicle.customer.lastName}`
        : "";

      const targets = [
        vehicle.make,
        vehicle.model,
        vehicle.licensePlate ?? "",
        vehicle.vin ?? "",
        customerName,
      ];

      return targets.some((target) => target.toLowerCase().includes(normalizedSearch));
    });
  }, [vehicles, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">Manage vehicle information and service history.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load vehicles</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={`vehicle-skeleton-${index}`} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <Skeleton className="h-5 w-52" />
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
          {filteredVehicles.map((vehicle) => {
            const customer = vehicle.customer;
            const mileage = typeof vehicle.mileage === "number" ? vehicle.mileage.toLocaleString() : "—";
            const color = vehicle.color || "Unspecified";

            return (
              <Card key={vehicle.id} className="hover:shadow-elevated transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{formatVehicleTitle(vehicle)}</CardTitle>
                      <Badge variant="outline">{color}</Badge>
                    </div>
                    <CarIcon className="h-6 w-6 text-muted-foreground" />
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
                      <p className="font-medium">{vehicle.licensePlate || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Mileage
                      </p>
                      <p className="font-medium">{mileage} mi</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">VIN</p>
                    <p className="font-mono text-xs bg-muted p-2 rounded border">
                      {vehicle.vin || "VIN not available"}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {customer ? `${customer.firstName} ${customer.lastName}` : "No owner on file"}
                        </p>
                        <p className="text-muted-foreground">{customer?.phone || "No phone"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setMediaVehicleId(vehicle.id)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVehicleId(vehicle.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" disabled title="Service history coming soon">
                      <FileText className="w-4 h-4 mr-1" />
                      Service History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <CarIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No vehicles found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Add your first vehicle to get started."}
                </p>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)}>
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
      <AddVehicleModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onVehicleCreated={refresh}
      />
      <EditVehicleModal
        open={Boolean(editingVehicleId)}
        vehicleId={editingVehicleId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVehicleId(null);
          }
        }}
        onVehicleUpdated={refresh}
      />
    </div>
  );
}

export const ErrorBoundary = createRouteErrorBoundary("Vehicles");
