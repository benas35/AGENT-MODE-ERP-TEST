import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Car, AlertCircle, Phone, Wrench, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: any;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
  monthView?: boolean;
}

export const AppointmentCard = ({ appointment, onDragStart, compact = false, monthView = false }: AppointmentCardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'booked':
        return <Clock className="h-3 w-3" />;
      case 'checked_in':
        return <User className="h-3 w-3" />;
      case 'in_progress':
        return <Wrench className="h-3 w-3" />;
      case 'waiting_parts':
        return <AlertTriangle className="h-3 w-3" />;
      case 'done':
        return <CheckCircle className="h-3 w-3" />;
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'tentative':
        return <Clock className="h-3 w-3" />;
      case 'in_service':
        return <Wrench className="h-3 w-3" />;
      case 'no_show':
        return <X className="h-3 w-3" />;
      case 'cancelled':
        return <X className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-blue-500 border-blue-600';
      case 'checked_in':
        return 'bg-amber-500 border-amber-600';
      case 'in_progress':
        return 'bg-orange-500 border-orange-600';
      case 'waiting_parts':
        return 'bg-purple-500 border-purple-600';
      case 'done':
        return 'bg-green-500 border-green-600';
      case 'confirmed':
        return 'bg-green-500 border-green-600';
      case 'tentative':
        return 'bg-yellow-500 border-yellow-600';
      case 'in_service':
        return 'bg-blue-500 border-blue-600';
      case 'no_show':
        return 'bg-red-500 border-red-600';
      case 'cancelled':
        return 'bg-gray-500 border-gray-600';
      case 'completed':
        return 'bg-emerald-500 border-emerald-600';
      default:
        return 'bg-slate-500 border-slate-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);

  if (monthView) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        className={cn(
          "p-1 rounded text-xs cursor-move border-l-2",
          getStatusColor(appointment.status),
          getPriorityColor(appointment.priority),
          "text-white"
        )}
      >
        <div className="font-medium truncate">{appointment.title}</div>
        <div className="text-xs opacity-90">{format(startTime, 'HH:mm')}</div>
      </div>
    );
  }

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      className={cn(
        "cursor-move transition-all hover:shadow-md border-l-4",
        getStatusColor(appointment.status),
        getPriorityColor(appointment.priority),
        appointment.priority === 'urgent' && "ring-2 ring-red-200",
        compact ? "h-full" : "min-h-[60px]"
      )}
    >
      <CardContent className={cn("p-2", compact && "p-1")}>
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-medium truncate",
              compact ? "text-xs" : "text-sm"
            )}>
              {appointment.title}
            </h4>
            {!compact && appointment.customer_name && (
              <p className="text-xs text-muted-foreground truncate">
                {appointment.customer_name}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {getStatusIcon(appointment.status)}
            {appointment.priority === 'urgent' && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
          </div>
          
          {!compact && appointment.vehicle_info && (
            <div className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              {appointment.vehicle_info}
            </div>
          )}
        </div>

        {!compact && (
          <div className="flex items-center justify-between mt-2">
            <Badge variant="secondary" className="text-xs">
              {appointment.source}
            </Badge>
            
            {appointment.technician_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {appointment.technician_name}
              </div>
            )}
          </div>
        )}

        {appointment.description && !compact && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {appointment.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};