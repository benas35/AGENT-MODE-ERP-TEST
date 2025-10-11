import { useState } from "react";
import { createRouteErrorBoundary } from "@/app/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { mockWorkOrders, getCustomerById, getVehicleById, getTechnicianById, WorkOrder } from "@/data/mockData";
import { ServiceDeskInbox } from "@/features/chat/ServiceDeskInbox";

const statusConfig = {
  'scheduled': { 
    label: 'Scheduled', 
    color: 'bg-status-scheduled text-white',
    icon: Calendar 
  },
  'in-progress': { 
    label: 'In Progress', 
    color: 'bg-status-in-progress text-white',
    icon: Timer 
  },
  'waiting-parts': { 
    label: 'Waiting Parts', 
    color: 'bg-status-waiting text-white',
    icon: Package 
  },
  'ready': { 
    label: 'Ready', 
    color: 'bg-status-ready text-white',
    icon: CheckCircle2 
  },
  'completed': { 
    label: 'Completed', 
    color: 'bg-status-completed text-white',
    icon: CheckCircle2 
  }
};

export default function WorkOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filterWorkOrders = (status?: WorkOrder['status']) => {
    let filtered = mockWorkOrders;
    
    if (status) {
      filtered = filtered.filter(wo => wo.status === status);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(wo =>
        wo.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCustomerById(wo.customerId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getVehicleById(wo.vehicleId)?.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const WorkOrderCard = ({ workOrder }: { workOrder: WorkOrder }) => {
    const customer = getCustomerById(workOrder.customerId);
    const vehicle = getVehicleById(workOrder.vehicleId);
    const technician = workOrder.technicianId ? getTechnicianById(workOrder.technicianId) : null;
    const config = statusConfig[workOrder.status];
    const StatusIcon = config.icon;

    return (
      <Card key={workOrder.id} className="hover:shadow-elevated transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{workOrder.number}</CardTitle>
                <Badge className={config.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <h3 className="font-medium text-foreground">{workOrder.title}</h3>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">${workOrder.total.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{workOrder.estimatedHours}h estimated</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{customer?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>
                  {vehicle?.year} {vehicle?.make} {vehicle?.model}
                  <span className="text-muted-foreground ml-2">({vehicle?.licensePlate})</span>
                </span>
              </div>
              {technician && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Assigned to: <span className="font-medium">{technician.name}</span></span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Created: {new Date(workOrder.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {new Date(workOrder.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Parts: ${workOrder.partsTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">{workOrder.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
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
            {workOrder.status === 'scheduled' && (
              <Button size="sm">
                Start Work
              </Button>
            )}
            {workOrder.status === 'in-progress' && (
              <Button size="sm" variant="outline">
                Update Status
              </Button>
            )}
            {workOrder.status === 'ready' && (
              <Button size="sm">
                Create Invoice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getTabCounts = () => {
    return {
      all: mockWorkOrders.length,
      scheduled: mockWorkOrders.filter(wo => wo.status === 'scheduled').length,
      'in-progress': mockWorkOrders.filter(wo => wo.status === 'in-progress').length,
      'waiting-parts': mockWorkOrders.filter(wo => wo.status === 'waiting-parts').length,
      ready: mockWorkOrders.filter(wo => wo.status === 'ready').length,
      completed: mockWorkOrders.filter(wo => wo.status === 'completed').length,
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">Track and manage all service work orders.</p>
        </div>
        <Button>
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

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <Badge variant="secondary" className="ml-1">{tabCounts['in-progress']}</Badge>
          </TabsTrigger>
          <TabsTrigger value="waiting-parts" className="flex items-center gap-2">
            Waiting Parts
            <Badge variant="secondary" className="ml-1">{tabCounts['waiting-parts']}</Badge>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders().map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders('scheduled').map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders('in-progress').map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="waiting-parts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders('waiting-parts').map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders('ready').map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filterWorkOrders('completed').map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filterWorkOrders().length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">No work orders found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search terms." : "Create your first work order to get started."}
                </p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Work Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const ErrorBoundary = createRouteErrorBoundary("Work orders");
