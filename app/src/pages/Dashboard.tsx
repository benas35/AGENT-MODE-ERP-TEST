import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  Car,
  DollarSign,
  Clock,
  Users,
  Wrench,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Timer
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

type StatusKey =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

const statusConfig: Record<StatusKey, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", color: "bg-status-scheduled text-white" },
  IN_PROGRESS: { label: "In Progress", color: "bg-status-in-progress text-white" },
  WAITING_PARTS: { label: "Waiting Parts", color: "bg-status-waiting text-white" },
  READY: { label: "Ready", color: "bg-status-ready text-white" },
  COMPLETED: { label: "Completed", color: "bg-status-completed text-white" },
  CANCELLED: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
  UNKNOWN: { label: "Unknown", color: "bg-muted text-muted-foreground" },
};

const toTitleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function Dashboard() {
  const { workOrders, technicians, metrics, loading, error } = useDashboardData();

  const renderActiveWorkOrders = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={`workorder-skeleton-${index}`} className="p-3 border rounded-lg">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          ))}
        </div>
      );
    }

    if (!workOrders.length) {
      return <p className="text-sm text-muted-foreground">No work orders available.</p>;
    }

    return (
      <div className="space-y-4">
        {workOrders.slice(0, 5).map((workOrder) => {
          const status = (workOrder.status ?? "UNKNOWN") as StatusKey;
          const config = statusConfig[status] ?? statusConfig.UNKNOWN;
          const customerName = workOrder.customer
            ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
            : "Unknown Customer";
          const vehicleInfo = workOrder.vehicle
            ? `${workOrder.vehicle.year ?? ""} ${workOrder.vehicle.make} ${workOrder.vehicle.model}`.trim()
            : "Vehicle not assigned";
          const technicianMeta = workOrder.technician?.meta as Record<string, unknown> | null | undefined;
          const technicianName =
            workOrder.technician?.name ??
            (typeof technicianMeta?.display_name === "string" ? technicianMeta.display_name : "Unassigned");

          return (
            <div key={workOrder.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{workOrder.work_order_number}</span>
                  <Badge variant="secondary" className={config.color}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {customerName} - {vehicleInfo}
                </p>
                <p className="text-sm font-medium">{workOrder.title || "Untitled Work Order"}</p>
                <p className="text-xs text-muted-foreground">Assigned to: {technicianName}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  ${typeof workOrder.total === "number" ? workOrder.total.toLocaleString() : "0"}
                </p>
                {workOrder.estimated_hours && (
                  <p className="text-xs text-muted-foreground">{workOrder.estimated_hours}h est.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTechnicianStatus = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={`tech-skeleton-${index}`} className="p-3 border rounded-lg">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          ))}
        </div>
      );
    }

    if (!technicians.length) {
      return <p className="text-sm text-muted-foreground">No technicians are currently active.</p>;
    }

    return (
      <div className="space-y-4">
        {technicians.map((technician) => {
          const badgeClass =
            technician.status === "available"
              ? "bg-success text-success-foreground"
              : technician.status === "busy"
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-muted-foreground";

          return (
            <div key={technician.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{technician.name}</span>
                  <Badge variant="secondary" className={badgeClass}>
                    <div className="flex items-center gap-1">
                      {technician.status === "available" && <CheckCircle2 className="h-3 w-3" />}
                      {technician.status === "busy" && <Timer className="h-3 w-3" />}
                      {technician.status === "off-duty" && <Clock className="h-3 w-3" />}
                      {toTitleCase(technician.status)}
                    </div>
                  </Badge>
                </div>
                {technician.specialty && (
                  <p className="text-sm text-muted-foreground">{technician.specialty}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening in your shop today.</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dashboard data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics.todayWorkOrders}</div>
            )}
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles in Shop</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics.vehiclesInShop}</div>
            )}
            <p className="text-xs text-muted-foreground">Currently being serviced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WIP Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${metrics.wipValue.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">Work in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Repair Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${metrics.averageRepairOrder.toFixed(0)}</div>
            )}
            <p className="text-xs text-muted-foreground">This month's average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Active Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>{renderActiveWorkOrders()}</CardContent>
        </Card>

        {/* Technician Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Technician Status
              </CardTitle>
              {!loading && (
                <Badge variant="outline" className="text-xs">
                  {metrics.busyTechnicians} busy
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>{renderTechnicianStatus()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
