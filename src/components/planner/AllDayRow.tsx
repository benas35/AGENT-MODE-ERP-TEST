import React from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTimeOff } from '@/hooks/useTimeOff';

interface AllDayRowProps {
  resources: any[];
  selectedDate: Date;
}

export const AllDayRow = ({ resources, selectedDate }: AllDayRowProps) => {
  const { timeOffEvents } = useTimeOff(selectedDate);
  const getResourceTimeOff = (resourceId: string) => {
    return timeOffEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      return event.resource_id === resourceId && 
             eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const hasShopClosed = () => {
    // Check if it's weekend or holiday
    const dayOfWeek = selectedDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  return (
    <div className="flex border-b border-border bg-accent/20 min-h-8">
      {/* Time column spacer */}
      <div className="w-20 border-r border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground font-medium">All Day</span>
      </div>
      
      {/* Unassigned column */}
      <div className="min-w-48 border-r border-border p-1">
        {hasShopClosed() && (
          <Badge variant="outline" className="text-xs bg-muted">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Shop Closed
          </Badge>
        )}
      </div>
      
      {/* Resource columns */}
      {resources.map((resource) => {
        const resourceTimeOff = getResourceTimeOff(resource.id);
        
        return (
          <div key={resource.id} className="min-w-48 border-r border-border p-1">
            {resourceTimeOff.map((timeOff) => (
              <Badge 
                key={timeOff.id} 
                variant="outline" 
                className={cn(
                  "text-xs mr-1 mb-1",
                  "bg-destructive/10 border-destructive/20 text-destructive"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {timeOff.reason || 'Time Off'}
              </Badge>
            ))}
          </div>
        );
      })}
    </div>
  );
};