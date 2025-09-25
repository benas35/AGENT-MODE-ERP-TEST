import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Car, Wrench, AlertCircle, CheckCircle, Package, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VehicleThumbnail } from './VehicleThumbnail';

interface AppointmentTileProps {
  appointment: any;
  compact?: boolean;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-50 border-blue-200 text-blue-900';
    case 'in_progress':
      return 'bg-amber-50 border-amber-200 text-amber-900';
    case 'completed':
      return 'bg-green-50 border-green-200 text-green-900';
    case 'ready':
      return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    case 'overdue':
      return 'bg-red-50 border-red-200 text-red-900';
    case 'cancelled':
      return 'bg-gray-50 border-gray-200 text-gray-500';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-900';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'border-l-red-500';
    case 'normal':
      return 'border-l-blue-500';
    case 'low':
      return 'border-l-gray-400';
    default:
      return 'border-l-blue-500';
  }
};

const getServiceTypeIcon = (title: string) => {
  const lowerTitle = title?.toLowerCase() || '';
  if (lowerTitle.includes('oil')) return <Wrench className="h-3 w-3" />;
  if (lowerTitle.includes('brake')) return <AlertCircle className="h-3 w-3" />;
  if (lowerTitle.includes('tire')) return <Car className="h-3 w-3" />;
  if (lowerTitle.includes('diagnostic')) return <AlertCircle className="h-3 w-3" />;
  return <Wrench className="h-3 w-3" />;
};

export const AppointmentTile: React.FC<AppointmentTileProps> = ({
  appointment,
  compact = false,
  className
}) => {
  const customerName = appointment.customer 
    ? `${appointment.customer.first_name} ${appointment.customer.last_name}`
    : 'Unknown Customer';
  
  const vehicleInfo = appointment.vehicle
    ? `${appointment.vehicle.year || ''} ${appointment.vehicle.make} ${appointment.vehicle.model}`.trim()
    : 'No Vehicle';
  
  const licensePlate = appointment.vehicle?.license_plate;
  
  const startTime = format(new Date(appointment.start_time), 'h:mm a');
  const endTime = format(new Date(appointment.end_time), 'h:mm a');
  
  // Check if appointment is overdue
  const isOverdue = appointment.sla_due_at && new Date(appointment.sla_due_at) < new Date();
  const displayStatus = isOverdue ? 'overdue' : appointment.status;

  return (
    <div
      className={cn(
        'relative rounded-lg border-l-4 p-2 shadow-sm transition-all hover:shadow-md cursor-pointer',
        getStatusColor(displayStatus),
        getPriorityColor(appointment.priority),
        compact ? 'min-h-8' : 'min-h-16',
        className
      )}
    >
      <div className="flex items-start gap-2 h-full">
        {/* Vehicle Thumbnail */}
        {!compact && (
          <VehicleThumbnail 
            vehicleId={appointment.vehicle_id}
            make={appointment.vehicle?.make}
            size="sm"
            className="flex-shrink-0"
          />
        )}
        
        <div className="flex-1 min-w-0">
          {/* Header with time and title */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium truncate">
                {compact ? startTime : `${startTime} - ${endTime}`}
              </span>
            </div>
            
            {/* Service type icon */}
            <div className="flex-shrink-0 text-muted-foreground">
              {getServiceTypeIcon(appointment.title)}
            </div>
          </div>
          
          {/* Title */}
          <h4 className={cn(
            "font-medium truncate",
            compact ? "text-xs" : "text-sm"
          )}>
            {appointment.title || 'Service Appointment'}
          </h4>
          
          {!compact && (
            <>
              {/* Customer Info */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span className="truncate">{customerName}</span>
              </div>
              
              {/* Vehicle Info */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Car className="h-3 w-3" />
                <span className="truncate">
                  {licensePlate ? `${licensePlate} • ` : ''}{vehicleInfo}
                </span>
              </div>
            </>
          )}
          
          {/* Status badges and indicators */}
          <div className="flex items-center gap-1 mt-2">
            {/* DVI Status */}
            {appointment.dvi_status && (
              <div className={cn(
                "w-2 h-2 rounded-full",
                appointment.dvi_status === 'approved' ? 'bg-green-500' :
                appointment.dvi_status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
              )} />
            )}
            
            {/* Parts Ready */}
            {appointment.parts_ready && (
              <Package className="h-3 w-3 text-green-600" />
            )}
            
            {/* Payment Status */}
            {appointment.payment_status === 'paid' && (
              <CreditCard className="h-3 w-3 text-green-600" />
            )}
            
            {/* Priority Badge */}
            {appointment.priority === 'high' && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                High
              </Badge>
            )}
            
            {/* Overdue indicator */}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Overdue
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Resize handles for drag operations */}
      <div className="absolute top-0 left-0 right-0 h-2 cursor-n-resize opacity-0 hover:opacity-100 hover:bg-primary/20" />
      <div className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 hover:opacity-100 hover:bg-primary/20" />
    </div>
  );
};