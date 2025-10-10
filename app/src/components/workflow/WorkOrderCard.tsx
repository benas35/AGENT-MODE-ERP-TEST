import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, User, Car, MoreVertical, AlertTriangle, DollarSign, Wrench } from 'lucide-react';
import { ViewWorkOrderModal } from './ViewWorkOrderModal';
import { AddNoteModal } from './AddNoteModal';
import { NotifyCustomerModal } from './NotifyCustomerModal';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { VehicleThumbnail } from '@/components/planner/VehicleThumbnail';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { WorkOrderProgressIndicator } from './WorkOrderProgressIndicator';

interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  color: string;
}

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
  };
  vehicle?: {
    year?: number;
    make: string;
    model: string;
    license_plate?: string;
  };
  technician?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  stage: WorkflowStage;
  onMoveToStage: (workOrderId: string, toStageId: string, notes?: string) => Promise<void>;
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  workOrder,
  stage,
  onMoveToStage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  const isOverdue = workOrder.sla_due_at && new Date(workOrder.sla_due_at) < new Date();
  const customerName = workOrder.customer 
    ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
    : 'Unknown Customer';
  
  const vehicleInfo = workOrder.vehicle
    ? `${workOrder.vehicle.year || ''} ${workOrder.vehicle.make} ${workOrder.vehicle.model}`.trim()
    : 'No Vehicle';

  const technicianName = workOrder.technician?.display_name || 
    (workOrder.technician?.first_name && workOrder.technician?.last_name
      ? `${workOrder.technician.first_name} ${workOrder.technician.last_name}`
      : null);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('workOrderId', workOrder.id);
    e.dataTransfer.setData('fromStageId', workOrder.workflow_stage_id || 'unassigned');
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-move hover:shadow-lg transition-all duration-200 bg-card",
        isDragging && "opacity-50 scale-95",
        isOverdue && "ring-2 ring-destructive/20 border-destructive/30"
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Vehicle Photo Header */}
      <div className="relative h-32 bg-muted/30 flex items-center justify-center">
        <VehicleThumbnail 
          vehicleId={workOrder.vehicle_id}
          make={workOrder.vehicle?.make}
          size="lg"
          className="w-full h-full"
        />
        
        {/* Status Badge Overlay */}
        <div className="absolute top-2 left-2">
          <WorkOrderStatusBadge 
            status={workOrder.status}
            priority={workOrder.priority}
          />
        </div>

        {/* Actions Menu */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowViewModal(true)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Work Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNoteModal(true)}>
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNotifyModal(true)}>
                Notify Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Overdue Alert */}
        {isOverdue && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header Info */}
        <div>
          <h4 className="font-semibold text-sm leading-tight mb-1">
            {workOrder.title || `Work Order ${workOrder.work_order_number}`}
          </h4>
          <p className="text-xs text-muted-foreground">
            #{workOrder.work_order_number}
          </p>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{customerName}</p>
            {workOrder.customer?.phone && (
              <p className="text-xs text-muted-foreground">{workOrder.customer.phone}</p>
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{vehicleInfo}</p>
            {workOrder.vehicle?.license_plate && (
              <p className="text-xs text-muted-foreground">{workOrder.vehicle.license_plate}</p>
            )}
          </div>
        </div>

        {/* Technician */}
        {technicianName && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-green-500/10 text-green-600">
                <Wrench className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{technicianName}</p>
              <p className="text-xs text-muted-foreground">Assigned Tech</p>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {(workOrder.estimated_hours || workOrder.actual_hours) && (
          <WorkOrderProgressIndicator
            estimatedHours={workOrder.estimated_hours}
            actualHours={workOrder.actual_hours}
          />
        )}

        {/* Hours and Estimate */}
        {(workOrder.estimated_hours || workOrder.total_estimate) && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {workOrder.estimated_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {workOrder.estimated_hours}h est.
                </span>
              </div>
            )}
            {workOrder.total_estimate && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium">
                  ${workOrder.total_estimate.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {workOrder.priority && (
              <Badge variant={getPriorityColor(workOrder.priority)} className="text-xs">
                {workOrder.priority}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {workOrder.sla_due_at ? (
              <span className={cn(isOverdue && "text-destructive font-medium")}>
                {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(workOrder.sla_due_at), { addSuffix: true })}
              </span>
            ) : (
              <span>
                {formatDistanceToNow(new Date(workOrder.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewWorkOrderModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        workOrder={workOrder}
      />

      <AddNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        workOrderId={workOrder.id}
        workOrderNumber={workOrder.work_order_number}
      />

      <NotifyCustomerModal
        open={showNotifyModal}
        onOpenChange={setShowNotifyModal}
        workOrderId={workOrder.id}
        workOrderNumber={workOrder.work_order_number}
        customerName={customerName}
        customerPhone={workOrder.customer?.phone}
        customerEmail={workOrder.customer?.email}
      />
    </Card>
  );
};