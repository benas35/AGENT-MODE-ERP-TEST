import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, TrendingUp } from 'lucide-react';
import { useTechnicians } from '@/hooks/useTechnicians';
import { Button } from '@/components/ui/button';

interface CapacityData {
  technician_id: string;
  name: string;
  color: string;
  utilization: number;
  scheduled_hours: number;
  capacity_hours: number;
}

export const CapacityIndicator = () => {
  const { technicians, loading } = useTechnicians();

  // Mock capacity data - in real implementation this would come from appointments
  const mockCapacityData: CapacityData[] = technicians.map(tech => ({
    technician_id: tech.id,
    name: tech.display_name,
    color: tech.color,
    utilization: Math.floor(Math.random() * 100),
    scheduled_hours: Math.floor(Math.random() * 8),
    capacity_hours: tech.capacity_minutes / 60
  }));

  const totalUtilization = mockCapacityData.length > 0 
    ? mockCapacityData.reduce((sum, tech) => sum + tech.utilization, 0) / mockCapacityData.length 
    : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active technicians</p>
        <Button variant="outline" size="sm" className="mt-2">
          Add Technician
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall capacity */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Capacity</span>
          <Badge 
            variant={totalUtilization > 80 ? 'destructive' : totalUtilization > 60 ? 'default' : 'secondary'}
          >
            {Math.round(totalUtilization)}%
          </Badge>
        </div>
        <Progress value={totalUtilization} className="h-2" />
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{mockCapacityData.reduce((sum, tech) => sum + tech.scheduled_hours, 0)}h scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{mockCapacityData.reduce((sum, tech) => sum + tech.capacity_hours, 0)}h available</span>
          </div>
        </div>
      </div>

      {/* Individual technician capacity */}
      <div className="space-y-3">
        {mockCapacityData.map((tech) => (
          <div key={tech.technician_id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: tech.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{tech.name}</span>
                <span className="text-xs text-muted-foreground">{tech.utilization}%</span>
              </div>
              <Progress value={tech.utilization} className="h-1.5" />
              <div className="text-xs text-muted-foreground mt-1">
                {tech.scheduled_hours}h / {tech.capacity_hours}h
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
