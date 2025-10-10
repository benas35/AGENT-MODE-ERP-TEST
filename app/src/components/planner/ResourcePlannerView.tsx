import React, { useState, useEffect } from 'react';
import { format, startOfDay, addMinutes, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';
import { useResources } from '@/hooks/useResources';
import { ResourceColumn } from './ResourceColumn';
import { AllDayRow } from './AllDayRow';
import { AppointmentBlock } from './AppointmentBlock';
import { QuickCreatePopover } from './QuickCreatePopover';

interface ResourcePlannerViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  view: 'day' | 'week' | 'month';
  resourceFilter: 'all' | 'technicians' | 'bays';
  searchQuery: string;
  onCreateAppointment: (data: any) => void;
}

export const ResourcePlannerView = ({
  selectedDate,
  onDateSelect,
  view,
  resourceFilter,
  searchQuery,
  onCreateAppointment
}: ResourcePlannerViewProps) => {
  const { appointments, loading: appointmentsLoading } = useAppointments(selectedDate, view);
  const { resources, loading: resourcesLoading } = useResources(resourceFilter);
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  const [selectedResourceLane, setSelectedResourceLane] = useState<'technicians' | 'bays'>('technicians');
  
  // Time slots configuration
  const startHour = 7;
  const endHour = 20;
  const slotMinutes = 15;
  const pixelsPerSlot = 15;

  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = view === 'day' ? 1 : view === 'week' ? 7 : 30;
    const newDate = addDays(selectedDate, direction === 'next' ? amount : -amount);
    onDateSelect(newDate);
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotMinutes) {
        const time = startOfDay(selectedDate);
        time.setHours(hour, minute);
        slots.push(time);
      }
    }
    return slots;
  };

  const getAppointmentsForResource = (resourceId: string | null) => {
    return appointments.filter(apt => {
      if (resourceId === null) {
        // Unassigned appointments
        return !apt.resources || apt.resources.length === 0;
      }
      return apt.resources && apt.resources.some((r: any) => r.id === resourceId);
    });
  };

  const getAppointmentStyle = (appointment: any) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    
    const startMinuteOfDay = (start.getHours() - startHour) * 60 + start.getMinutes();
    const topOffset = (startMinuteOfDay / slotMinutes) * pixelsPerSlot;
    const height = Math.max((duration / slotMinutes) * pixelsPerSlot, 30);

    return {
      position: 'absolute' as const,
      top: `${topOffset}px`,
      height: `${height}px`,
      left: '4px',
      right: '4px',
      zIndex: 10,
    };
  };

  const calculateUtilization = (resourceId: string, date: Date) => {
    const resourceAppointments = getAppointmentsForResource(resourceId);
    const dayAppointments = resourceAppointments.filter(apt => 
      isSameDay(new Date(apt.start_time), date)
    );
    
    const totalMinutes = dayAppointments.reduce((acc, apt) => {
      const start = new Date(apt.start_time);
      const end = new Date(apt.end_time);
      return acc + ((end.getTime() - start.getTime()) / (1000 * 60));
    }, 0);
    
    const workingHours = (endHour - startHour) * 60; // minutes
    return Math.round((totalMinutes / workingHours) * 100);
  };

  const handleDragStart = (e: React.DragEvent, appointment: any) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, resourceId: string | null, timeSlot?: Date) => {
    e.preventDefault();
    if (draggedAppointment && timeSlot) {
      const duration = new Date(draggedAppointment.end_time).getTime() - new Date(draggedAppointment.start_time).getTime();
      const newEndTime = new Date(timeSlot.getTime() + duration);
      
      console.log('Reschedule appointment', draggedAppointment.id, 'to resource', resourceId, 'at', timeSlot);
      // TODO: Implement reschedule API call
      setDraggedAppointment(null);
    }
  };

  const handleSlotClick = (resourceId: string | null, timeSlot: Date) => {
    // This will be handled by the QuickCreatePopover
  };

  const timeSlots = getTimeSlots();
  const filteredResources = resourceFilter === 'all' 
    ? resources.filter(r => r.type === selectedResourceLane.slice(0, -1).toUpperCase() as 'TECHNICIAN' | 'BAY')
    : resources;

  if (appointmentsLoading || resourcesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading planner...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onDateSelect(new Date())}>
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold">
            {format(selectedDate, view === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Europe/Vilnius
            </Badge>
          </div>
        </div>

        {/* Resource Lane Selector for All Resources */}
        {resourceFilter === 'all' && (
          <div className="px-4 pb-4">
            <Tabs value={selectedResourceLane} onValueChange={(value) => setSelectedResourceLane(value as any)}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="technicians">Technicians</TabsTrigger>
                <TabsTrigger value="bays">Service Bays</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Resource Headers */}
      <div className="flex border-b border-border bg-card">
        {/* Time column header */}
        <div className="w-20 border-r border-border h-16 flex items-center justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Unassigned column header */}
        <ResourceColumn 
          isUnassigned 
          appointmentsCount={getAppointmentsForResource(null).length}
        />
        
        {/* Resource column headers */}
        {filteredResources.map((resource) => (
          <ResourceColumn
            key={resource.id}
            resource={resource}
            utilization={calculateUtilization(resource.id, selectedDate)}
          />
        ))}
      </div>

      {/* All Day Row */}
      <AllDayRow
        resources={filteredResources}
        selectedDate={selectedDate}
      />

      {/* Time Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 border-r border-border">
            {timeSlots.map((slot, index) => (
              <div 
                key={index} 
                className="flex items-center justify-center text-xs text-muted-foreground border-b border-border"
                style={{ height: `${pixelsPerSlot}px` }}
              >
                {index % 4 === 0 && format(slot, 'HH:mm')}
              </div>
            ))}
          </div>
          
          {/* Unassigned column */}
          <div className="min-w-48 border-r border-border relative">
            {timeSlots.map((slot, index) => (
              <QuickCreatePopover
                key={`unassigned-${index}`}
                selectedDate={selectedDate}
                selectedTime={slot}
                onCreateAppointment={onCreateAppointment}
              >
                <div
                  className="border-b border-border hover:bg-accent/20 cursor-pointer"
                  style={{ height: `${pixelsPerSlot}px` }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, null, slot)}
                />
              </QuickCreatePopover>
            ))}
            
            {/* Unassigned appointments */}
            {getAppointmentsForResource(null).map((appointment) => (
              <div
                key={appointment.id}
                style={getAppointmentStyle(appointment)}
              >
                <AppointmentBlock
                  appointment={appointment}
                  onDragStart={(e) => handleDragStart(e, appointment)}
                />
              </div>
            ))}
          </div>
          
          {/* Resource columns */}
          {filteredResources.map((resource) => (
            <div key={resource.id} className="min-w-48 border-r border-border relative">
              {timeSlots.map((slot, index) => (
                <QuickCreatePopover
                  key={`${resource.id}-${index}`}
                  selectedDate={selectedDate}
                  selectedTime={slot}
                  resourceId={resource.id}
                  onCreateAppointment={onCreateAppointment}
                >
                  <div
                    className="border-b border-border hover:bg-accent/20 cursor-pointer"
                    style={{ height: `${pixelsPerSlot}px` }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, resource.id, slot)}
                  />
                </QuickCreatePopover>
              ))}
              
              {/* Resource appointments */}
              {getAppointmentsForResource(resource.id).map((appointment) => (
                <div
                  key={appointment.id}
                  style={getAppointmentStyle(appointment)}
                >
                  <AppointmentBlock
                    appointment={appointment}
                    onDragStart={(e) => handleDragStart(e, appointment)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};