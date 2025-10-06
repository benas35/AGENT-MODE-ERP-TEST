import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkOrderCard } from './WorkOrderCard';
import { cn } from '@/lib/utils';

interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_final: boolean;
  sla_hours?: number;
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
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
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

interface WorkflowColumnProps {
  stage: WorkflowStage;
  workOrders: WorkOrder[];
  onMoveWorkOrder: (workOrderId: string, toStageId: string, notes?: string) => Promise<void>;
  isUnassigned?: boolean;
}

export const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
  stage,
  workOrders,
  onMoveWorkOrder,
  isUnassigned = false,
}) => {
  const overdueCount = workOrders.filter(wo => 
    wo.sla_due_at && new Date(wo.sla_due_at) < new Date()
  ).length;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const workOrderId = e.dataTransfer.getData('workOrderId');
    const fromStageId = e.dataTransfer.getData('fromStageId');
    
    if (workOrderId && fromStageId !== stage.id) {
      await onMoveWorkOrder(workOrderId, stage.id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="flex flex-col w-80 h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Column Header */}
      <Card className="p-4 mb-4 border-t-4" style={{ borderTopColor: stage.color }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {workOrders.length}
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </div>
        
        {stage.description && (
          <p className="text-xs text-muted-foreground mb-2">{stage.description}</p>
        )}
        
        {stage.sla_hours && (
          <Badge variant="outline" className="text-xs">
            SLA: {stage.sla_hours}h
          </Badge>
        )}
      </Card>

      {/* Work Orders */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {workOrders.map((workOrder) => (
          <WorkOrderCard
            key={workOrder.id}
            workOrder={workOrder}
            stage={stage}
            onMoveToStage={onMoveWorkOrder}
          />
        ))}
        
        {workOrders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No work orders in this stage
          </div>
        )}
      </div>
    </div>
  );
};