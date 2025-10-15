import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { mockWorkOrders, mockCustomers, mockVehicles, mockTechnicians, getWorkOrdersByStatus, getCustomerById, getVehicleById, getTechnicianById } from "@/data/mockData";

const statusColors = {
  'scheduled': 'bg-status-scheduled',
  'in-progress': 'bg-status-in-progress', 
  'waiting-parts': 'bg-status-waiting',
  'ready': 'bg-status-ready',
  'completed': 'bg-status-completed'
};

const statusLabels = {
  'scheduled': 'Scheduled',
  'in-progress': 'In Progress',
  'waiting-parts': 'Waiting Parts', 
  'ready': 'Ready',
  'completed': 'Completed'
};

export default function Dashboard() {
  const todayWorkOrders = mockWorkOrders.filter(wo => {
    const today = new Date().toDateString();
    const woDate = new Date(wo.createdAt).toDateString();
    return today === woDate;
  });

  const wipValue = mockWorkOrders
    .filter(wo => wo.status === 'in-progress')
    .reduce((sum, wo) => sum + wo.total, 0);

  const averageRepairOrder = mockWorkOrders.length > 0 
    ? mockWorkOrders.reduce((sum, wo) => sum + wo.total, 0) / mockWorkOrders.length 
    : 0;

  const busyTechnicians = mockTechnicians.filter(t => t.status === 'busy').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening in your shop today.</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayWorkOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles in Shop</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getWorkOrdersByStatus('in-progress').length + getWorkOrdersByStatus('waiting-parts').length}</div>
            <p className="text-xs text-muted-foreground">
              Currently being serviced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WIP Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${wipValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Work in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Repair Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageRepairOrder.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              This month's average
            </p>
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
          <CardContent>
            <div className="space-y-4">
              {mockWorkOrders.slice(0, 5).map((workOrder) => {
                const customer = getCustomerById(workOrder.customerId);
                const vehicle = getVehicleById(workOrder.vehicleId);
                const technician = workOrder.technicianId ? getTechnicianById(workOrder.technicianId) : null;
                
                return (
                  <div key={workOrder.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{workOrder.number}</span>
                        <Badge 
                          variant="secondary" 
                          className={`${statusColors[workOrder.status]} text-white`}
                        >
                          {statusLabels[workOrder.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {customer?.name} - {vehicle?.year} {vehicle?.make} {vehicle?.model}
                      </p>
                      <p className="text-sm font-medium">{workOrder.title}</p>
                      {technician && (
                        <p className="text-xs text-muted-foreground">Assigned to: {technician.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${workOrder.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{workOrder.estimatedHours}h est.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Technician Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Technician Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTechnicians.map((technician) => (
                <div key={technician.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{technician.name}</span>
                      <Badge 
                        variant={technician.status === 'available' ? 'default' : technician.status === 'busy' ? 'secondary' : 'outline'}
                        className={
                          technician.status === 'available' ? 'bg-success text-success-foreground' :
                          technician.status === 'busy' ? 'bg-warning text-warning-foreground' :
                          'bg-muted text-muted-foreground'
                        }
                      >
                        <div className="flex items-center gap-1">
                          {technician.status === 'available' && <CheckCircle2 className="h-3 w-3" />}
                          {technician.status === 'busy' && <Timer className="h-3 w-3" />}
                          {technician.status === 'off-duty' && <Clock className="h-3 w-3" />}
                          {technician.status.charAt(0).toUpperCase() + technician.status.slice(1).replace('-', ' ')}
                        </div>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{technician.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${technician.hourlyRate}/hr</p>
                    {technician.status === 'busy' && (
                      <p className="text-xs text-muted-foreground">Currently working</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 text-sm">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-muted-foreground">10:30 AM</span>
              <span>Work Order <strong>WO-2024-004</strong> marked as ready for pickup</span>
            </div>
            <div className="flex items-center gap-3 p-2 text-sm">
              <div className="w-2 h-2 bg-status-in-progress rounded-full"></div>
              <span className="text-muted-foreground">09:15 AM</span>
              <span>Carlos Rodriguez started work on <strong>WO-2024-001</strong></span>
            </div>
            <div className="flex items-center gap-3 p-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">08:45 AM</span>
              <span>New customer <strong>John Smith</strong> added to system</span>
            </div>
            <div className="flex items-center gap-3 p-2 text-sm">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span className="text-muted-foreground">08:20 AM</span>
              <span>Low inventory alert: <strong>Semi-Metallic Brake Pads</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}