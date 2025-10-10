import React, { useState } from 'react';
import { WorkflowBoard } from '@/components/workflow/WorkflowBoard';
import { WorkflowHeader } from '@/components/workflow/WorkflowHeader';
import { EnhancedWorkflowMetrics } from '@/components/workflow/EnhancedWorkflowMetrics';
import { useWorkflowStages } from '@/hooks/useWorkflowStages';
import { useRealtimeWorkflow } from '@/hooks/useRealtimeWorkflow';

const Workflow = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days ahead
  });

  const { stages, loading: stagesLoading } = useWorkflowStages();
  const { workOrders, loading: workOrdersLoading, moveWorkOrder, refreshWorkOrders } = useRealtimeWorkflow({
    locationId: selectedLocation === 'all' ? undefined : selectedLocation,
    technicianId: selectedTechnician === 'all' ? undefined : selectedTechnician,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const handleMoveWorkOrder = async (workOrderId: string, toStageId: string, notes?: string) => {
    await moveWorkOrder(workOrderId, toStageId, notes);
    refreshWorkOrders();
  };

  if (stagesLoading || workOrdersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4">
      <WorkflowHeader
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedTechnician={selectedTechnician}
        onTechnicianChange={setSelectedTechnician}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refreshWorkOrders}
      />

      <EnhancedWorkflowMetrics
        stages={stages}
        workOrders={workOrders}
        dateRange={dateRange}
      />

      <WorkflowBoard
        stages={stages}
        workOrders={workOrders}
        onMoveWorkOrder={handleMoveWorkOrder}
      />
    </div>
  );
};

export default Workflow;