import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, Target } from 'lucide-react';

interface WorkOrderProgressIndicatorProps {
  estimatedHours?: number;
  actualHours?: number;
  className?: string;
}

export const WorkOrderProgressIndicator: React.FC<WorkOrderProgressIndicatorProps> = ({
  estimatedHours = 0,
  actualHours = 0,
  className
}) => {
  const progressPercentage = estimatedHours > 0 
    ? Math.min((actualHours / estimatedHours) * 100, 100)
    : 0;

  const isOverTime = actualHours > estimatedHours && estimatedHours > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={isOverTime ? 'text-destructive font-medium' : 'text-foreground'}>
            {actualHours}h
          </span>
          {estimatedHours > 0 && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{estimatedHours}h</span>
            </>
          )}
        </div>
      </div>
      
      {estimatedHours > 0 && (
        <Progress 
          value={progressPercentage} 
          className={`h-2 ${isOverTime ? 'bg-destructive/20' : ''}`}
        />
      )}
    </div>
  );
};