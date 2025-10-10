import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  sla_hours?: number;
}

interface WorkOrder {
  id: string;
  workflow_stage_id?: string;
  sla_due_at?: string;
  stage_entered_at?: string;
  created_at: string;
}

interface WorkflowMetricsProps {
  stages: WorkflowStage[];
  workOrders: WorkOrder[];
  dateRange: { from: Date; to: Date };
}

export const WorkflowMetrics: React.FC<WorkflowMetricsProps> = ({
  stages,
  workOrders,
  dateRange,
}) => {
  // Calculate metrics
  const totalWorkOrders = workOrders.length;
  const overdueWorkOrders = workOrders.filter(wo => 
    wo.sla_due_at && new Date(wo.sla_due_at) < new Date()
  ).length;
  
  const completedToday = workOrders.filter(wo => {
    const finalStage = stages.find(s => s.name.toLowerCase().includes('completed'));
    return wo.workflow_stage_id === finalStage?.id && 
           new Date(wo.stage_entered_at || wo.created_at).toDateString() === new Date().toDateString();
  }).length;

  const avgCycleTime = workOrders.reduce((acc, wo) => {
    if (wo.stage_entered_at) {
      const hours = (new Date().getTime() - new Date(wo.stage_entered_at).getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }
    return acc;
  }, 0) / Math.max(workOrders.length, 1);

  // Calculate stage utilization
  const stageMetrics = stages.map(stage => {
    const stageWorkOrders = workOrders.filter(wo => wo.workflow_stage_id === stage.id);
    const overdueInStage = stageWorkOrders.filter(wo => 
      wo.sla_due_at && new Date(wo.sla_due_at) < new Date()
    ).length;
    
    return {
      ...stage,
      count: stageWorkOrders.length,
      overdueCount: overdueInStage,
      utilization: (stageWorkOrders.length / Math.max(totalWorkOrders, 1)) * 100,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalWorkOrders}</div>
          <p className="text-xs text-muted-foreground">
            +12% from last week
          </p>
        </CardContent>
      </Card>

      {/* Overdue Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overdueWorkOrders}</div>
          <p className="text-xs text-muted-foreground">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedToday}</div>
          <p className="text-xs text-muted-foreground">
            +3 from yesterday
          </p>
        </CardContent>
      </Card>

      {/* Average Cycle Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(avgCycleTime)}h</div>
          <p className="text-xs text-muted-foreground">
            -2h from last week
          </p>
        </CardContent>
      </Card>
    </div>
  );
};