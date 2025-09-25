import React from 'react';
import { format, addHours, startOfDay } from 'date-fns';
import { User, Square, Car, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppointmentCard } from './AppointmentCard';
import { useAppointments } from '@/hooks/useAppointments';

interface ResourceTimelineProps {
  selectedDate: Date;
  resourceFilter: 'all' | 'technicians' | 'bays';
  searchQuery: string;
}

export const ResourceTimeline = ({ selectedDate, resourceFilter, searchQuery }: ResourceTimelineProps) => {
  const { appointments, loading } = useAppointments(selectedDate, 'day');

  // Mock resources data - in real app this would come from API
  const resources = [
    // Technicians
    { id: '1', name: 'Mike Johnson', type: 'TECHNICIAN', color: '#FF6B6B', specialties: ['engine', 'diagnostics'] },
    { id: '2', name: 'Sarah Wilson', type: 'TECHNICIAN', color: '#4ECDC4', specialties: ['brakes', 'suspension'] },
    { id: '3', name: 'David Chen', type: 'TECHNICIAN', color: '#45B7D1', specialties: ['transmission'] },
    { id: '4', name: 'Lisa Garcia', type: 'TECHNICIAN', color: '#96CEB4', specialties: ['electrical', 'ac'] },
    { id: '5', name: 'Tom Anderson', type: 'TECHNICIAN', color: '#FFEAA7', specialties: ['tires', 'alignment'] },
    { id: '6', name: 'Emma Thompson', type: 'TECHNICIAN', color: '#DDA0DD', specialties: ['general'] },
    
    // Bays
    { id: '7', name: 'Bay 1 - Quick Service', type: 'BAY', color: '#E74C3C', liftType: 'two_post' },
    { id: '8', name: 'Bay 2 - Heavy Duty', type: 'BAY', color: '#3498DB', liftType: 'four_post' },
    { id: '9', name: 'Bay 3 - Alignment', type: 'BAY', color: '#2ECC71', liftType: 'scissor' },
    { id: '10', name: 'Bay 4 - General Service', type: 'BAY', color: '#F39C12', liftType: 'two_post' },
  ];

  const filteredResources = resources.filter(resource => {
    if (resourceFilter === 'technicians') return resource.type === 'TECHNICIAN';
    if (resourceFilter === 'bays') return resource.type === 'BAY';
    return true;
  });

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
      apt.resources?.some((r: any) => r.id === resourceId)
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

      {filteredResources.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No resources found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </div>
      )}
    </div>
  );
};