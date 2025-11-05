import React from 'react';
import { WorkflowColumn } from './WorkflowColumn';

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

interface WorkflowBoardProps {
  stages: WorkflowStage[];
  workOrders: WorkOrder[];
  onMoveWorkOrder: (workOrderId: string, toStageId: string, notes?: string) => Promise<void>;
}

export const WorkflowBoard: React.FC<WorkflowBoardProps> = ({
  stages,
  workOrders,
  onMoveWorkOrder,
}) => {
  const getWorkOrdersForStage = (stageId: string) => {
    return workOrders.filter(wo => wo.workflow_stage_id === stageId);
  };

  const getUnassignedWorkOrders = () => {
    return workOrders.filter(wo => !wo.workflow_stage_id);
  };

  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {/* Unassigned Column */}
        <WorkflowColumn
          stage={{
            id: 'unassigned',
            name: 'Unassigned',
            slug: 'unassigned',
            color: '#6B7280',
            sort_order: -1,
            is_default: false,
            is_final: false,
          }}
          workOrders={getUnassignedWorkOrders()}
          onMoveWorkOrder={onMoveWorkOrder}
          isUnassigned
        />

        {/* Stage Columns */}
        {stages.map((stage) => (
          <WorkflowColumn
            key={stage.id}
            stage={stage}
            workOrders={getWorkOrdersForStage(stage.id)}
            onMoveWorkOrder={onMoveWorkOrder}
          />
        ))}
      </div>
    </div>
  );
};