import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorkOrderStatusBadgeProps {
  status: string;
  priority?: string;
  className?: string;
}

export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({
  status,
  priority,
  className
}) => {
  const getStatusVariant = (status: string, priority?: string) => {
    if (priority === 'urgent') return 'destructive';
    
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'finished':
        return 'secondary';
      case 'in_progress':
      case 'active':
        return 'default';
      case 'on_hold':
      case 'waiting':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return 'In Progress';
      case 'on_hold':
        return 'On Hold';
      default:
        return status?.replace(/_/g, ' ').toUpperCase() || 'ACTIVE';
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(status, priority)} 
      className={cn("text-xs font-medium", className)}
    >
      {getStatusLabel(status)}
    </Badge>
  );
};