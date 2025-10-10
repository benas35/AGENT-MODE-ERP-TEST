import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Car, AlertCircle, Wrench, CheckCircle, X, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AppointmentBlockProps {
  appointment: any;
  onDragStart?: (e: React.DragEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  isCompact?: boolean;
}

export const AppointmentBlock = ({ 
  appointment, 
  onDragStart, 
  onContextMenu,
  style,
  isCompact = true 
}: AppointmentBlockProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Clock className="h-3 w-3" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-3 w-3" />;
      case 'IN_SERVICE':
        return <Wrench className="h-3 w-3" />;
      case 'NO_SHOW':
        return <X className="h-3 w-3" />;
      case 'CANCELLED':
        return <X className="h-3 w-3" />;
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'border-l-blue-500 bg-blue-50 border-blue-200';
      case 'CONFIRMED':
        return 'border-l-green-500 bg-green-50 border-green-200';
      case 'IN_SERVICE':
        return 'border-l-orange-500 bg-orange-50 border-orange-200';
      case 'NO_SHOW':
        return 'border-l-red-500 bg-red-50 border-red-200';
      case 'CANCELLED':
        return 'border-l-gray-500 bg-gray-50 border-gray-200';
      case 'COMPLETED':
        return 'border-l-emerald-500 bg-emerald-50 border-emerald-200';
      default:
        return 'border-l-slate-500 bg-slate-50 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'ring-2 ring-red-200';
      case 'high':
        return 'border-r-orange-400';
      case 'normal':
        return '';
      case 'low':
        return 'opacity-80';
      default:
        return '';
    }
  };

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onContextMenu={onContextMenu}
      style={style}
      className={cn(
        "cursor-move transition-all hover:shadow-md border-l-4 border-r-2 select-none",
        getStatusColor(appointment.status),
        getPriorityColor(appointment.priority),
        appointment.priority === 'urgent' && "ring-2 ring-red-200",
        isCompact ? "min-h-12" : "min-h-16",
        "relative"
      )}
    >
      <CardContent className="p-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              {getStatusIcon(appointment.status)}
              {appointment.priority === 'urgent' && (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              )}
              <h4 className="font-medium text-xs truncate flex-1">
                {appointment.title}
              </h4>
            </div>
            
            <div className="text-xs text-muted-foreground mb-1">
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ({duration}m)
            </div>
            
            {!isCompact && appointment.customer_name && (
              <div className="text-xs text-muted-foreground truncate">
                {appointment.customer_name}
              </div>
            )}
            
            {appointment.work_order_id && (
              <Badge variant="secondary" className="text-xs mt-1">
                WO-{appointment.work_order_id.slice(-4)}
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Edit appointment</DropdownMenuItem>
              <DropdownMenuItem>Convert to WO</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Send SMS</DropdownMenuItem>
              <DropdownMenuItem>Send Email</DropdownMenuItem>
              <DropdownMenuItem>Add to Waitlist</DropdownMenuItem>
              <DropdownMenuItem>Attach Photo</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {appointment.resources && appointment.resources.length > 1 && (
          <div className="flex gap-1 mt-1">
            {appointment.resources.slice(1).map((resource: any) => (
              <Badge key={resource.id} variant="outline" className="text-xs">
                {resource.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};