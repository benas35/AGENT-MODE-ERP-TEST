import React, { useState, useEffect } from 'react';
import { format, addHours, startOfDay } from 'date-fns';
import { User, Square, Car, Clock, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppointmentCard } from './AppointmentCard';
import { useAppointments } from '@/hooks/useAppointments';
import { useTechnicians } from '@/hooks/useTechnicians';

interface ResourceTimelineProps {
  selectedDate: Date;
  resourceFilter: 'all' | 'technicians' | 'bays';
  searchQuery: string;
}

export const ResourceTimeline = ({ selectedDate, resourceFilter, searchQuery }: ResourceTimelineProps) => {
  const { appointments, loading: appointmentsLoading } = useAppointments(selectedDate, 'day');
  const { technicians, loading: techniciansLoading } = useTechnicians();

  // Filter resources based on the filter
  const filteredResources = React.useMemo(() => {
    if (resourceFilter === 'technicians') {
      return technicians.map(tech => ({
        id: tech.id,
        name: tech.display_name,
        type: 'TECHNICIAN' as const,
        color: tech.color,
        specialties: tech.skills
      }));
    }
    
    if (resourceFilter === 'bays') {
      // Mock bays for now - could be fetched from another table
      return [
        { id: '7', name: 'Bay 1 - Quick Service', type: 'BAY' as const, color: '#E74C3C', liftType: 'two_post' },
        { id: '8', name: 'Bay 2 - Heavy Duty', type: 'BAY' as const, color: '#3498DB', liftType: 'four_post' },
        { id: '9', name: 'Bay 3 - Alignment', type: 'BAY' as const, color: '#2ECC71', liftType: 'scissor' },
        { id: '10', name: 'Bay 4 - General Service', type: 'BAY' as const, color: '#F39C12', liftType: 'two_post' },
      ];
    }
    
    // 'all' - return technicians by default
    return technicians.map(tech => ({
      id: tech.id,
      name: tech.display_name,
      type: 'TECHNICIAN' as const,
      color: tech.color,
      specialties: tech.skills
    }));
  }, [technicians, resourceFilter]);

  const loading = appointmentsLoading || techniciansLoading;

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'TECHNICIAN':
        return User;
      case 'BAY':
        return Square;
      case 'COURTESY_CAR':
        return Car;
      default:
        return User;
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    const startHour = 7; // 7 AM
    const endHour = 19; // 7 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      const time = startOfDay(selectedDate);
      time.setHours(hour);
      slots.push(time);
    }
    return slots;
  };

  const getResourceAppointments = (resourceId: string) => {
    return appointments.filter(apt => 
      apt.technician_id === resourceId || 
      apt.assigned_to === resourceId
    );
  };

  const getAppointmentPosition = (appointment: any) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
    
    const left = ((startHour - 7) / 12) * 100; // 12 hours from 7 AM to 7 PM
    const width = (duration / 12) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 8)}%` };
  };

  const timeSlots = getTimeSlots();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Time header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex">
          <div className="w-64 border-r border-border p-4">
            <h3 className="font-semibold">Resources</h3>
          </div>
          <div className="flex-1 flex">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex-1 p-2 border-r border-border text-center text-sm font-medium">
                {format(slot, 'HH:mm')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource rows */}
      <div className="space-y-1">
        {filteredResources.map((resource) => {
          const Icon = getResourceIcon(resource.type);
          const resourceAppointments = getResourceAppointments(resource.id);
          
          return (
            <div key={resource.id} className="flex border-b border-border hover:bg-accent/30">
              {/* Resource info */}
              <div className="w-64 border-r border-border p-4 flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: resource.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate">{resource.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {resource.type === 'TECHNICIAN' && resource.specialties && (
                      <span>{resource.specialties.join(', ')}</span>
                    )}
                    {resource.type === 'BAY' && resource.liftType && (
                      <span>{resource.liftType.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
                
                <Badge variant="secondary" className="text-xs">
                  {resourceAppointments.length}
                </Badge>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative h-20 flex items-center">
                {/* Time grid background */}
                <div className="absolute inset-0 flex">
                  {timeSlots.map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 border-r border-border/50 last:border-r-0"
                    />
                  ))}
                </div>

                {/* Appointments */}
                {resourceAppointments.map((appointment) => {
                  const position = getAppointmentPosition(appointment);
                  return (
                    <div
                      key={appointment.id}
                      className="absolute top-2 bottom-2 z-10 px-1"
                      style={{ left: position.left, width: position.width }}
                    >
                      <AppointmentCard
                        appointment={appointment}
                        compact={true}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filteredResources.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Active Technicians</h3>
            <p className="text-muted-foreground mb-4">
              {resourceFilter === 'technicians' 
                ? 'No active technicians found. Add technicians to start scheduling.'
                : 'No resources found for the selected filter.'
              }
            </p>
            {resourceFilter === 'technicians' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Technician
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
