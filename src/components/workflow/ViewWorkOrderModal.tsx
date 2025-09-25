import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Car, 
  Clock, 
  DollarSign, 
  Wrench, 
  Calendar,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { VehicleThumbnail } from '@/components/planner/VehicleThumbnail';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  workflow_stage_id?: string;
  stage_entered_at?: string;
  sla_due_at?: string;
  created_at: string;
  vehicle_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  total_estimate?: number;
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    address?: any;
  };
  vehicle?: {
    year?: number;
    make: string;
    model: string;
    license_plate?: string;
    vin?: string;
    color?: string;
  };
  technician?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    phone?: string;
  };
}

interface ViewWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder | null;
}

export const ViewWorkOrderModal: React.FC<ViewWorkOrderModalProps> = ({
  open,
  onOpenChange,
  workOrder,
}) => {
  if (!workOrder) return null;

  const customerName = workOrder.customer 
    ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
    : 'Unknown Customer';
  
  const vehicleInfo = workOrder.vehicle
    ? `${workOrder.vehicle.year || ''} ${workOrder.vehicle.make} ${workOrder.vehicle.model}`.trim()
    : 'No Vehicle';

  const technicianName = workOrder.technician?.display_name || 
    (workOrder.technician?.first_name && workOrder.technician?.last_name
      ? `${workOrder.technician.first_name} ${workOrder.technician.last_name}`
      : 'Unassigned');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              #{workOrder.work_order_number}
              <WorkOrderStatusBadge 
                status={workOrder.status}
                priority={workOrder.priority}
              />
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Work Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Work Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {workOrder.title || `Work Order ${workOrder.work_order_number}`}
                  </h3>
                  {workOrder.description && (
                    <p className="text-muted-foreground mt-2">{workOrder.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(workOrder.created_at), 'PPp')}</span>
                    </div>
                  </div>
                  
                  {workOrder.sla_due_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(workOrder.sla_due_at), 'PPp')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {(workOrder.estimated_hours || workOrder.total_estimate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {workOrder.estimated_hours && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estimated Hours</label>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{workOrder.estimated_hours}h</span>
                        </div>
                      </div>
                    )}
                    
                    {workOrder.total_estimate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estimate</label>
                        <div className="flex items-center gap-1 mt-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>${workOrder.total_estimate.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <VehicleThumbnail 
                    vehicleId={workOrder.vehicle_id}
                    make={workOrder.vehicle?.make}
                    size="lg"
                    className="w-24 h-24 rounded-lg"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{vehicleInfo}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {workOrder.vehicle?.license_plate && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">License Plate</label>
                          <div className="mt-1">{workOrder.vehicle.license_plate}</div>
                        </div>
                      )}
                      
                      {workOrder.vehicle?.vin && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">VIN</label>
                          <div className="mt-1 font-mono text-sm">{workOrder.vehicle.vin}</div>
                        </div>
                      )}
                      
                      {workOrder.vehicle?.color && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Color</label>
                          <div className="mt-1">{workOrder.vehicle.color}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold">{customerName}</h3>
                </div>
                
                {workOrder.customer?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{workOrder.customer.phone}</span>
                  </div>
                )}
                
                {workOrder.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{workOrder.customer.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned Technician */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="w-4 h-4" />
                  Technician
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-500/10 text-green-600">
                      <Wrench className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{technicianName}</div>
                    {workOrder.technician?.phone && (
                      <div className="text-sm text-muted-foreground">{workOrder.technician.phone}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Customer
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Update
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Wrench className="w-4 h-4 mr-2" />
                  Edit Work Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};