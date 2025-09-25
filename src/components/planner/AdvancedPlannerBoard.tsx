import React, { useState, useCallback } from 'react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, Users, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlannerData } from '@/hooks/usePlannerData';
import { AppointmentBlock } from './AppointmentBlock';
import { cn } from '@/lib/utils';

interface AdvancedPlannerBoardProps {
  selectedDate: Date;
  branchId?: string;
  view: 'day' | 'week' | 'month';
  onDateSelect: (date: Date) => void;
  onAppointmentClick?: (appointmentId: string) => void;
}

export const AdvancedPlannerBoard: React.FC<AdvancedPlannerBoardProps> = ({
  selectedDate,
  branchId,
  view,
  onDateSelect,
  onAppointmentClick
}) => {
  const [plannerView, setPlannerView] = useState<'zones' | 'technicians'>('zones');
  const {
    appointments,
    workZones,
    resources,
    loading,
    error,
    moveAppointment,
    getWorkZoneAppointments,
    getResourceAppointments,
    getWorkZoneUtilization,
    getResourceUtilization
  } = usePlannerData(selectedDate, branchId, view);

  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination, source } = result;
    const appointmentId = draggableId;
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (!appointment) return;

    // Parse destination info
    const [destinationType, destinationId, timeSlot] = destination.droppableId.split('-');
    
    if (destinationType === 'zone' || destinationType === 'resource') {
      // Calculate new time based on time slot if provided
      const currentStart = new Date(appointment.start_time);
      const currentEnd = new Date(appointment.end_time);
      const duration = currentEnd.getTime() - currentStart.getTime();
      
      let newStartTime = currentStart;
      let newEndTime = currentEnd;
      
      if (timeSlot) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        newStartTime = new Date(selectedDate);
        newStartTime.setHours(hours, minutes, 0, 0);
        newEndTime = new Date(newStartTime.getTime() + duration);
      }

      const newWorkZoneId = destinationType === 'zone' ? destinationId : undefined;
      const newResourceIds = destinationType === 'resource' ? [destinationId] : undefined;

      await moveAppointment(
        appointmentId,
        newStartTime,
        newEndTime,
        newWorkZoneId,
        newResourceIds
      );
    }
  }, [appointments, moveAppointment, selectedDate]);

  const renderTimeGrid = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

    return (
      <div className="grid grid-cols-1 gap-2">
        {hours.map(hour => (
          <div key={hour} className="flex items-center border-b border-border py-2">
            <div className="w-16 text-sm text-muted-foreground">
              {format(new Date().setHours(hour, 0), 'h:mm a')}
            </div>
            <div className="flex-1 h-12 bg-muted/20 rounded-md" />
          </div>
        ))}
      </div>
    );
  };

  const renderWorkZoneView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {workZones.map(zone => {
        const zoneAppointments = getWorkZoneAppointments(zone.id);
        const utilization = getWorkZoneUtilization(zone.id);
        
        return (
          <Card key={zone.id} className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  {zone.name}
                </CardTitle>
                <Badge variant={utilization > 90 ? 'destructive' : utilization > 70 ? 'default' : 'secondary'}>
                  {utilization.toFixed(0)}%
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Capacity: {zone.capacity}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {zoneAppointments.length} jobs
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Droppable droppableId={`zone-${zone.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-48 space-y-2 p-2 rounded-md transition-colors",
                      snapshot.isDraggingOver && "bg-accent/50"
                    )}
                  >
                    {zoneAppointments.map((appointment, index) => (
                      <Draggable
                        key={appointment.id}
                        draggableId={appointment.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "transition-transform",
                              snapshot.isDragging && "rotate-2 scale-105"
                            )}
                            onClick={() => onAppointmentClick?.(appointment.id)}
                          >
                            <AppointmentBlock
                              appointment={appointment}
                              isCompact={true}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {zoneAppointments.length === 0 && (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        No appointments scheduled
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderTechnicianView = () => {
    const technicians = resources.filter(r => r.type === 'TECHNICIAN');
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {technicians.map(tech => {
          const techAppointments = getResourceAppointments(tech.id);
          const utilization = getResourceUtilization(tech.id);
          
          return (
            <Card key={tech.id} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tech.color }}
                    />
                    {tech.name}
                  </CardTitle>
                  <Badge variant={utilization > 90 ? 'destructive' : utilization > 70 ? 'default' : 'secondary'}>
                    {utilization.toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {techAppointments.length} jobs
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={`resource-${tech.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-48 space-y-2 p-2 rounded-md transition-colors",
                        snapshot.isDraggingOver && "bg-accent/50"
                      )}
                    >
                      {techAppointments.map((appointment, index) => (
                        <Draggable
                          key={appointment.id}
                          draggableId={appointment.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "transition-transform",
                                snapshot.isDragging && "rotate-2 scale-105"
                              )}
                              onClick={() => onAppointmentClick?.(appointment.id)}
                            >
                              <AppointmentBlock
                                appointment={appointment}
                                isCompact={true}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {techAppointments.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                          No appointments assigned
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          );
        })}
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
          <p>Error loading planner: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* View Toggle */}
        <Tabs value={plannerView} onValueChange={(value) => setPlannerView(value as 'zones' | 'technicians')}>
          <TabsList>
            <TabsTrigger value="zones" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Work Zones
            </TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Technicians
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zones" className="mt-6">
            {renderWorkZoneView()}
          </TabsContent>

          <TabsContent value="technicians" className="mt-6">
            {renderTechnicianView()}
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => 
                      apt.sla_due_at && new Date(apt.sla_due_at) < new Date()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DragDropContext>
  );
};