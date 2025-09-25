import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { User, Square, Car } from 'lucide-react';

export const CapacityIndicator = () => {
  // Mock data - in real app this would come from API
  const capacityData = [
    {
      type: 'Technicians',
      icon: User,
      total: 6,
      busy: 4,
      available: 2,
      color: 'text-blue-600'
    },
    {
      type: 'Service Bays',
      icon: Square,
      total: 4,
      busy: 3,
      available: 1,
      color: 'text-green-600'
    },
    {
      type: 'Courtesy Cars',
      icon: Car,
      total: 2,
      busy: 1,
      available: 1,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-4">
      {capacityData.map((item) => {
        const utilization = (item.busy / item.total) * 100;
        const Icon = item.icon;
        
        return (
          <div key={item.type} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium">{item.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {item.busy}/{item.total}
                </Badge>
              </div>
            </div>
            
            <Progress value={utilization} className="h-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{item.available} available</span>
              <span>{Math.round(utilization)}% utilized</span>
            </div>
          </div>
        );
      })}
      
      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Overall Capacity</div>
        <Progress value={75} className="h-2" />
        <div className="text-xs text-muted-foreground mt-1 text-center">
          75% shop utilization
        </div>
      </div>
    </div>
  );
};