import React, { useState, useCallback, useRef, useEffect } from 'react';
import { format, addMinutes, startOfDay, differenceInMinutes, isToday } from 'date-fns';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppointmentTile } from './AppointmentTile';
import { CreateAppointmentModal } from './CreateAppointmentModal';
import { usePlannerData } from '@/hooks/usePlannerData';

interface ColumnarPlannerViewProps {
  selectedDate: Date;
  branchId?: string;
  resourceType: 'technicians' | 'workzones';
  searchQuery?: string;
  onAppointmentClick?: (appointmentId: string) => void;
}

interface DragSelection {
  startTime: Date;
  endTime: Date;
  columnId: string;
  columnType: 'technician' | 'workzone' | 'unassigned';
}

export const ColumnarPlannerView: React.FC<ColumnarPlannerViewProps> = ({
  selectedDate,
  branchId,
  resourceType,
  searchQuery,
  onAppointmentClick
}) => {
  const {
    appointments,
    workZones,
    resources,
    loading,
    error,
    moveAppointment,
    getResourceAppointments,
    getWorkZoneAppointments
  } = usePlannerData(selectedDate, branchId, 'day');

  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Time configuration
  const SLOT_HEIGHT = 60; // 60px per hour
  const MINUTES_PER_SLOT = 15;
  const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT;
  const SLOT_PIXEL_HEIGHT = SLOT_HEIGHT / SLOTS_PER_HOUR;

  // Generate time slots from 7 AM to 7 PM
  const timeSlots = Array.from({ length: 12 * SLOTS_PER_HOUR }, (_, i) => {
    const startHour = 7;
    const totalMinutes = i * MINUTES_PER_SLOT;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return addMinutes(startOfDay(selectedDate), (startHour * 60) + totalMinutes);
  });

  const filteredResources = resourceType === 'technicians' 
    ? resources.filter(r => r.type === 'TECHNICIAN')
    : workZones;

  // Current time line position
  const currentTime = new Date();
  const currentTimeOffset = isToday(selectedDate) && currentTime.getHours() >= 7 && currentTime.getHours() < 19
    ? ((currentTime.getHours() - 7) * 60 + currentTime.getMinutes()) / MINUTES_PER_SLOT * SLOT_PIXEL_HEIGHT
    : null;

  const getAppointmentStyle = (appointment: any) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    const dayStart = startOfDay(selectedDate);
    dayStart.setHours(7); // 7 AM start

    const startOffset = differenceInMinutes(startTime, dayStart);
    const duration = differenceInMinutes(endTime, startTime);
    
    const top = (startOffset / MINUTES_PER_SLOT) * SLOT_PIXEL_HEIGHT;
    const height = Math.max((duration / MINUTES_PER_SLOT) * SLOT_PIXEL_HEIGHT, SLOT_PIXEL_HEIGHT);

    return { top, height };
  };

  const getTimeFromY = (y: number) => {
    const slotIndex = Math.floor(y / SLOT_PIXEL_HEIGHT);
    const boundedIndex = Math.max(0, Math.min(slotIndex, timeSlots.length - 1));
    return timeSlots[boundedIndex];
  };

  const handlePointerDown = (e: React.PointerEvent, columnId: string, columnType: 'technician' | 'workzone' | 'unassigned') => {
    if (!gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startTime = getTimeFromY(y);
    
    setIsDragging(true);
    setDragStartY(y);
    setDragSelection({
      startTime,
      endTime: addMinutes(startTime, MINUTES_PER_SLOT),
      columnId,
      columnType
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartY || !gridRef.current || !dragSelection) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const currentY = e.clientY - rect.top;
    const startY = Math.min(dragStartY, currentY);
    const endY = Math.max(dragStartY, currentY);
    
    const startTime = getTimeFromY(startY);
    const endTime = getTimeFromY(endY + SLOT_PIXEL_HEIGHT);
    
    setDragSelection({
      ...dragSelection,
      startTime,
      endTime
    });
  };

  const handlePointerUp = () => {
    if (dragSelection && isDragging) {
      setShowCreateModal(true);
    }
    setIsDragging(false);
    setDragStartY(null);
  };

  const renderTimeRuler = () => (
    <div className="sticky left-0 z-20 w-20 bg-background border-r border-border">
      {/* All Day row */}
      <div className="h-16 flex items-center justify-center text-xs font-medium text-muted-foreground border-b border-border bg-muted/30">
        ALL DAY
      </div>
      
      {/* Time slots */}
      <div className="relative">
        {Array.from({ length: 12 }, (_, i) => {
          const hour = 7 + i;
          const time = new Date();
          time.setHours(hour, 0, 0, 0);
          
          return (
            <div key={hour} className="relative h-15" style={{ height: SLOT_HEIGHT }}>
              <div className="absolute inset-x-0 top-0 text-xs text-muted-foreground px-2 py-1">
                {format(time, 'h:mm a')}
              </div>
              {/* 15-minute ticks */}
              {[1, 2, 3].map(tick => (
                <div 
                  key={tick} 
                  className="absolute inset-x-0 border-t border-border/30"
                  style={{ top: tick * (SLOT_HEIGHT / 4) }}
                />
              ))}
            </div>
          );
        })}
        
        {/* Current time line */}
        {currentTimeOffset !== null && (
          <div 
            className="absolute inset-x-0 border-t-2 border-primary z-10"
            style={{ top: currentTimeOffset }}
          >
            <div className="absolute -left-2 -top-1 w-4 h-2 bg-primary rounded-full" />
          </div>
        )}
      </div>
    </div>
  );

  const renderColumnHeader = (resource: any, isUnassigned = false) => {
    const resourceAppointments = isUnassigned 
      ? appointments.filter(apt => !apt.resources?.length && !apt.work_zone_id)
      : resourceType === 'technicians' 
        ? getResourceAppointments(resource.id)
        : getWorkZoneAppointments(resource.id);

    const totalHours = resourceAppointments.reduce((sum, apt) => {
      const duration = differenceInMinutes(new Date(apt.end_time), new Date(apt.start_time));
      return sum + (duration / 60);
    }, 0);

    const capacity = isUnassigned ? 0 : resource.capacity || 8;
    const utilization = capacity > 0 ? (totalHours / capacity) * 100 : 0;

    return (
      <div className="h-16 p-3 border-b border-border bg-card">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!isUnassigned && (
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: resource.color }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">
                {isUnassigned ? 'Unassigned' : resource.name}
              </h3>
              {!isUnassigned && (
                <p className="text-xs text-muted-foreground">
                  {resourceType === 'technicians' ? 'Technician' : 'Work Zone'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge 
              variant={utilization > 90 ? 'destructive' : utilization > 70 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {resourceAppointments.length}
            </Badge>
            {!isUnassigned && (
              <Badge variant="outline" className="text-xs">
                {utilization.toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (resource: any, isUnassigned = false) => {
    const columnId = isUnassigned ? 'unassigned' : resource.id;
    const columnType = isUnassigned ? 'unassigned' : (resourceType === 'technicians' ? 'technician' : 'workzone');
    
    const columnAppointments = isUnassigned 
      ? appointments.filter(apt => !apt.resources?.length && !apt.work_zone_id)
      : resourceType === 'technicians' 
        ? getResourceAppointments(resource.id)
        : getWorkZoneAppointments(resource.id);

    return (
      <div className="flex-1 min-w-64 border-r border-border last:border-r-0">
        {renderColumnHeader(resource, isUnassigned)}
        
        <div className="relative bg-background">
          {/* Time grid */}
          <div className="absolute inset-0">
            {Array.from({ length: 12 }, (_, i) => (
              <div 
                key={i} 
                className="border-b border-border/30"
                style={{ height: SLOT_HEIGHT }}
              >
                {/* 15-minute subdivisions */}
                {[1, 2, 3].map(tick => (
                  <div 
                    key={tick}
                    className="border-b border-border/10"
                    style={{ 
                      height: SLOT_HEIGHT / 4,
                      marginTop: tick === 3 ? 0 : 'auto'
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* Drag overlay */}
          <div
            className="absolute inset-0 cursor-crosshair"
            onPointerDown={(e) => handlePointerDown(e, columnId, columnType)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ height: 12 * SLOT_HEIGHT }}
          >
            {/* Drag selection overlay */}
            {dragSelection && dragSelection.columnId === columnId && isDragging && (
              <div
                className="absolute inset-x-0 bg-primary/20 border-2 border-primary border-dashed rounded"
                style={{
                  top: getAppointmentStyle({ 
                    start_time: dragSelection.startTime, 
                    end_time: dragSelection.startTime 
                  }).top,
                  height: differenceInMinutes(dragSelection.endTime, dragSelection.startTime) / MINUTES_PER_SLOT * SLOT_PIXEL_HEIGHT
                }}
              />
            )}
          </div>
          
          {/* Appointments */}
          {columnAppointments.map((appointment) => {
            const style = getAppointmentStyle(appointment);
            return (
              <div
                key={appointment.id}
                className="absolute inset-x-1 z-10"
                style={{
                  top: style.top,
                  height: style.height
                }}
                onClick={() => onAppointmentClick?.(appointment.id)}
              >
                <AppointmentTile 
                  appointment={appointment}
                  compact={style.height < 40}
                />
              </div>
            );
          })}
          
          {/* Current time line */}
          {currentTimeOffset !== null && (
            <div 
              className="absolute inset-x-0 border-t-2 border-primary z-30 pointer-events-none"
              style={{ top: currentTimeOffset }}
            />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading planner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-destructive">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p>Error loading planner data</p>
          <p className="text-sm mt-2">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with current date and live time */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        {isToday(selectedDate) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Now: {format(new Date(), 'h:mm a')}</span>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="flex-1 flex overflow-auto" ref={gridRef}>
        {renderTimeRuler()}
        
        <div className="flex flex-1 min-w-0">
          {/* Unassigned Column */}
          {renderColumn(null, true)}
          
          {/* Resource Columns */}
          {filteredResources.map(resource => renderColumn(resource))}
        </div>
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        selectedDate={selectedDate}
        initialStartTime={dragSelection?.startTime}
        initialEndTime={dragSelection?.endTime}
        initialResourceId={dragSelection?.columnType === 'technician' ? dragSelection.columnId : undefined}
        initialWorkZoneId={dragSelection?.columnType === 'workzone' ? dragSelection.columnId : undefined}
        onSuccess={() => {
          setShowCreateModal(false);
          setDragSelection(null);
        }}
      />
    </div>
  );
};