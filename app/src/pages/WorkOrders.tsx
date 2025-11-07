import { useMemo, useState } from "react";
import { createRouteErrorBoundary } from "@/app/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  Plus,
  Clock,
  DollarSign,
  User,
  Car,
  Calendar,
  Eye,
  Edit,
  CheckCircle2,
  Timer,
  AlertCircle,
  Package
} from "lucide-react";
import { useWorkOrders, type WorkOrder as WorkOrderRecord } from "@/hooks/useWorkOrders";
import { ServiceDeskInbox } from "@/features/chat/ServiceDeskInbox";
import { CreateWorkOrderModal } from "@/components/workflow/CreateWorkOrderModal";
import { EditWorkOrderModal } from "@/components/workflow/EditWorkOrderModal";
import { ViewWorkOrderModal } from "@/components/workflow/ViewWorkOrderModal";

type WorkOrderStatusKey =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

type TabKey = "all" | "scheduled" | "in-progress" | "waiting-parts" | "ready" | "completed";

type WorkOrderType = WorkOrderRecord;

const statusConfig: Record<WorkOrderStatusKey, { label: string; color: string; icon: typeof Calendar }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Calendar },
  SCHEDULED: { label: "Scheduled", color: "bg-status-scheduled text-white", icon: Calendar },
  IN_PROGRESS: { label: "In Progress", color: "bg-status-in-progress text-white", icon: Timer },
  WAITING_PARTS: { label: "Waiting Parts", color: "bg-status-waiting text-white", icon: Package },
  READY: { label: "Ready", color: "bg-status-ready text-white", icon: CheckCircle2 },
  COMPLETED: { label: "Completed", color: "bg-status-completed text-white", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: AlertCircle },
  UNKNOWN: { label: "Unknown", color: "bg-muted text-muted-foreground", icon: AlertCircle },
};

const tabStatusMap: Record<TabKey, WorkOrderStatusKey | null> = {
  all: null,
  scheduled: "SCHEDULED",
  "in-progress": "IN_PROGRESS",
  "waiting-parts": "WAITING_PARTS",
  ready: "READY",
  completed: "COMPLETED",
};

const normalizeStatus = (status: string | null | undefined): WorkOrderStatusKey => {
  if (!status) return "UNKNOWN";
  const normalized = status.toUpperCase() as WorkOrderStatusKey;
  return normalized in statusConfig ? normalized : "UNKNOWN";
};

const buildDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
};

const renderSkeletonGrid = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[...Array(4)].map((_, index) => (
      <Card key={`workorder-skeleton-${index}`} className="hover:shadow-elevated transition-shadow">
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default function WorkOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<WorkOrderType | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string | null>(null);

  const { from: dateFrom, to: dateTo } = useMemo(buildDateRange, []);

  const { workOrders, loading, error, refreshWorkOrders } = useWorkOrders({
    dateFrom,
    dateTo,
  });

  const filterWorkOrders = (tab: TabKey) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const statusFilter = tabStatusMap[tab];

    return workOrders.filter((workOrder) => {
      const status = normalizeStatus(workOrder.status);
      if (statusFilter && status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchTargets = [
        workOrder.work_order_number,
        workOrder.title,
        workOrder.description,
        workOrder.customer ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}` : "",
        workOrder.customer?.phone,
        workOrder.vehicle ? `${workOrder.vehicle.make} ${workOrder.vehicle.model}` : "",
        workOrder.vehicle?.license_plate,
      ];

      return searchTargets.some((target) =>
        typeof target === "string" && target.toLowerCase().includes(normalizedSearch)
      );
    });
  };

  const tabCounts = useMemo(() => {
    const counts = {
      all: workOrders.length,
      scheduled: 0,
      "in-progress": 0,
      "waiting-parts": 0,
      ready: 0,
      completed: 0,
    } satisfies Record<TabKey, number>;

    for (const workOrder of workOrders) {
      const status = normalizeStatus(workOrder.status);
      if (status === "SCHEDULED") counts.scheduled += 1;
      if (status === "IN_PROGRESS") counts["in-progress"] += 1;
      if (status === "WAITING_PARTS") counts["waiting-parts"] += 1;
      if (status === "READY") counts.ready += 1;
      if (status === "COMPLETED") counts.completed += 1;
    }

    return counts;
  }, [workOrders]);

  const renderWorkOrderList = (items: WorkOrderType[]) => {
    if (loading) {
      return renderSkeletonGrid();
    }

    if (!items.length) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No work orders found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Create your first work order to get started."}
                </p>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Work Order
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((workOrder) => (
          <Card key={workOrder.id} className="hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{workOrder.work_order_number}</CardTitle>
                    {(() => {
                      const status = normalizeStatus(workOrder.status);
                      const config = statusConfig[status];
                      const StatusIcon = config.icon;
                      return (
                        <Badge className={config.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <h3 className="font-medium text-foreground">{workOrder.title || "Untitled work order"}</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    ${typeof workOrder.total === "number" ? workOrder.total.toLocaleString() : "0"}
                  </p>
                  {workOrder.estimated_hours && (
                    <p className="text-sm text-muted-foreground">{workOrder.estimated_hours}h estimated</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {workOrder.customer
                        ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
                        : "Unknown customer"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {workOrder.vehicle
                        ? `${workOrder.vehicle.year ?? ""} ${workOrder.vehicle.make} ${workOrder.vehicle.model}`.trim()
                        : "Vehicle not assigned"}
                      {workOrder.vehicle?.license_plate && (
                        <span className="text-muted-foreground ml-2">
                          ({workOrder.vehicle.license_plate})
                        </span>
                      )}
                    </span>
                  </div>
                  {workOrder.technician?.display_name && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Assigned to: <span className="font-medium">{workOrder.technician.display_name}</span></span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {workOrder.created_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Created: {new Date(workOrder.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {workOrder.sla_due_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Due: {new Date(workOrder.sla_due_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {workOrder.workflow_stage?.name && (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span>Stage: {workOrder.workflow_stage.name}</span>
                    </div>
                  )}
                  {typeof workOrder.total_estimate === "number" && (
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Estimate: ${workOrder.total_estimate.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  {workOrder.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewWorkOrder(workOrder)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingWorkOrderId(workOrder.id);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled title="Workflow actions coming soon">
                    Start Work
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Status updates coming soon">
                    Update Status
                  </Button>
                  <Button size="sm" disabled title="Invoicing coming soon">
                    Create Invoice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">Track and manage all service work orders.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Work Order
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by work order number, customer, vehicle, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Internal messaging inbox */}
      <ServiceDeskInbox />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load work orders</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="ml-1">{tabCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            Scheduled
            <Badge variant="secondary" className="ml-1">{tabCounts.scheduled}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="flex items-center gap-2">
            In Progress
            <Badge variant="secondary" className="ml-1">{tabCounts["in-progress"]}</Badge>
          </TabsTrigger>
          <TabsTrigger value="waiting-parts" className="flex items-center gap-2">
            Waiting Parts
            <Badge variant="secondary" className="ml-1">{tabCounts["waiting-parts"]}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex items-center gap-2">
            Ready
            <Badge variant="secondary" className="ml-1">{tabCounts.ready}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            <Badge variant="secondary" className="ml-1">{tabCounts.completed}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("all"))}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("scheduled"))}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("in-progress"))}
        </TabsContent>

        <TabsContent value="waiting-parts" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("waiting-parts"))}
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("ready"))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {renderWorkOrderList(filterWorkOrders("completed"))}
        </TabsContent>
      </Tabs>

      <CreateWorkOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onWorkOrderCreated={refreshWorkOrders}
      />
      <EditWorkOrderModal
        open={Boolean(editingWorkOrderId)}
        workOrderId={editingWorkOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingWorkOrderId(null);
          }
        }}
        onWorkOrderUpdated={refreshWorkOrders}
      />

      <ViewWorkOrderModal
        open={!!viewWorkOrder}
        onOpenChange={(open) => !open && setViewWorkOrder(null)}
        workOrder={viewWorkOrder}
      />
    </div>
  );
}

export const ErrorBoundary = createRouteErrorBoundary("Work orders");
