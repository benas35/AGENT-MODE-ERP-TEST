import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  Users, 
  DollarSign,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  priority?: string;
  technician_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  total_estimate?: number;
}

interface EnhancedMetrics {
  totalWorkOrders: number;
  overdueWorkOrders: number;
  completedToday: number;
  avgCycleTime: number;
  technicianUtilization: Array<{
    id: string;
    name: string;
    activeWorkOrders: number;
    utilization: number;
    efficiency: number;
  }>;
  stageBottlenecks: Array<{
    stageId: string;
    stageName: string;
    avgTimeInStage: number;
    workOrderCount: number;
    isBottleneck: boolean;
  }>;
  priorityDistribution: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
  revenueMetrics: {
    totalEstimated: number;
    avgOrderValue: number;
    completionRate: number;
  };
}

interface EnhancedWorkflowMetricsProps {
  stages: WorkflowStage[];
  workOrders: WorkOrder[];
  dateRange: { from: Date; to: Date };
}

export const EnhancedWorkflowMetrics: React.FC<EnhancedWorkflowMetricsProps> = ({
  stages,
  workOrders,
  dateRange,
}) => {
  const [metrics, setMetrics] = useState<EnhancedMetrics>({
    totalWorkOrders: 0,
    overdueWorkOrders: 0,
    completedToday: 0,
    avgCycleTime: 0,
    technicianUtilization: [],
    stageBottlenecks: [],
    priorityDistribution: [],
    revenueMetrics: {
      totalEstimated: 0,
      avgOrderValue: 0,
      completionRate: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    calculateMetrics();
  }, [workOrders, stages]);

  const calculateMetrics = async () => {
    setLoading(true);
    
    // Basic metrics
    const totalWorkOrders = workOrders.length;
    const overdueWorkOrders = workOrders.filter(wo => 
      wo.sla_due_at && new Date(wo.sla_due_at) < new Date()
    ).length;
    
    const completedStage = stages.find(s => s.name.toLowerCase().includes('completed'));
    const completedToday = workOrders.filter(wo => {
      return wo.workflow_stage_id === completedStage?.id && 
             new Date(wo.stage_entered_at || wo.created_at).toDateString() === new Date().toDateString();
    }).length;

    // Calculate average cycle time
    const avgCycleTime = workOrders.reduce((acc, wo) => {
      if (wo.stage_entered_at) {
        const hours = (new Date().getTime() - new Date(wo.stage_entered_at).getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }
      return acc;
    }, 0) / Math.max(workOrders.length, 1);

    // Priority distribution
    const priorityCount = workOrders.reduce((acc, wo) => {
      const priority = wo.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = Object.entries(priorityCount).map(([priority, count]) => ({
      priority,
      count,
      percentage: (count / totalWorkOrders) * 100,
    }));

    // Stage bottleneck analysis
    const stageBottlenecks = stages.map(stage => {
      const stageWorkOrders = workOrders.filter(wo => wo.workflow_stage_id === stage.id);
      const avgTimeInStage = stageWorkOrders.reduce((acc, wo) => {
        if (wo.stage_entered_at) {
          const hours = (new Date().getTime() - new Date(wo.stage_entered_at).getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }
        return acc;
      }, 0) / Math.max(stageWorkOrders.length, 1);

      return {
        stageId: stage.id,
        stageName: stage.name,
        avgTimeInStage: Math.round(avgTimeInStage),
        workOrderCount: stageWorkOrders.length,
        isBottleneck: avgTimeInStage > (stage.sla_hours || 24) * 1.2, // 20% over SLA is bottleneck
      };
    });

    // Revenue metrics
    const totalEstimated = workOrders.reduce((acc, wo) => acc + (wo.total_estimate || 0), 0);
    const avgOrderValue = totalEstimated / Math.max(totalWorkOrders, 1);
    const completionRate = (completedToday / Math.max(totalWorkOrders, 1)) * 100;

    // Fetch technician utilization
    const { data: technicians } = await supabase
      .from('resources')
      .select('id, name')
      .eq('type', 'TECHNICIAN')
      .eq('active', true);

    const technicianUtilization = await Promise.all(
      (technicians || []).map(async (tech) => {
        const techWorkOrders = workOrders.filter(wo => wo.technician_id === tech.id);
        const activeWorkOrders = techWorkOrders.filter(wo => 
          wo.workflow_stage_id !== completedStage?.id
        ).length;
        
        const totalHours = techWorkOrders.reduce((acc, wo) => acc + (wo.estimated_hours || 0), 0);
        const actualHours = techWorkOrders.reduce((acc, wo) => acc + (wo.actual_hours || 0), 0);
        
        return {
          id: tech.id,
          name: tech.name,
          activeWorkOrders,
          utilization: Math.min((totalHours / 40) * 100, 100), // Assuming 40h work week
          efficiency: actualHours > 0 ? (totalHours / actualHours) * 100 : 100,
        };
      })
    );

    setMetrics({
      totalWorkOrders,
      overdueWorkOrders,
      completedToday,
      avgCycleTime: Math.round(avgCycleTime),
      technicianUtilization,
      stageBottlenecks,
      priorityDistribution,
      revenueMetrics: {
        totalEstimated,
        avgOrderValue,
        completionRate,
      },
    });
    
    setLoading(false);
  };

  const OverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalWorkOrders}</div>
          <p className="text-xs text-muted-foreground">
            +12% from last week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{metrics.overdueWorkOrders}</div>
          <p className="text-xs text-muted-foreground">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completedToday}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.revenueMetrics.completionRate.toFixed(1)}% completion rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgCycleTime}h</div>
          <p className="text-xs text-muted-foreground">
            -2h from last week
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const PerformanceTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Stage Bottlenecks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.stageBottlenecks.map((stage) => (
            <div key={stage.stageId} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stage.stageName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {stage.avgTimeInStage}h avg
                  </span>
                  {stage.isBottleneck && (
                    <Badge variant="destructive" className="text-xs">
                      Bottleneck
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={Math.min((stage.workOrderCount / metrics.totalWorkOrders) * 100, 100)} 
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground min-w-[3rem]">
                  {stage.workOrderCount} orders
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technician Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.technicianUtilization.map((tech) => (
            <div key={tech.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tech.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {tech.activeWorkOrders} active
                  </span>
                  <Badge 
                    variant={tech.utilization > 90 ? "destructive" : tech.utilization > 70 ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {tech.utilization.toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={tech.utilization} 
                className="flex-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const RevenueTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.revenueMetrics.totalEstimated.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Active work orders value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.revenueMetrics.avgOrderValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Per work order
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.revenueMetrics.completionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Orders completed today
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <RevenueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};