import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, startOfMonth, endOfMonth, startOfDay, addMinutes, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, Car, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppointmentCard } from './AppointmentCard';
import { useAppointments } from '@/hooks/useAppointments';

interface PlannerCalendarProps {
  view: 'day' | 'week' | 'month';
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  resourceFilter: 'all' | 'technicians' | 'bays';
  searchQuery: string;
}

export const PlannerCalendar = ({ view, selectedDate, onDateSelect, resourceFilter, searchQuery }: PlannerCalendarProps) => {
  const { appointments, loading } = useAppointments(selectedDate, view);
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);

  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = view === 'day' ? 1 : view === 'week' ? 7 : 30;
    const newDate = addDays(selectedDate, direction === 'next' ? amount : -amount);
    onDateSelect(newDate);
  };

  const getViewDates = () => {
    switch (view) {
      case 'day':
        return [selectedDate];
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        });
      case 'month':
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      default:
        return [selectedDate];
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    const startHour = 7; // 7 AM
    const endHour = 19; // 7 PM
    const slotMinutes = 15;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotMinutes) {
        const time = startOfDay(selectedDate);
        time.setHours(hour, minute);
        slots.push(time);
      }
    }
    return slots;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.start_time), date));
  };

  const getAppointmentStyle = (appointment: any) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    const topOffset = ((start.getHours() - 7) * 60 + start.getMinutes()) * (60 / 15); // 15min slots = 60px each
    const height = (duration / 15) * 60; // Convert duration to pixels

    return {
      position: 'absolute' as const,
      top: `${topOffset}px`,
      height: `${Math.max(height, 60)}px`,
      left: '0',
      right: '0',
      zIndex: 1,
    };
  };

  const handleDragStart = (e: React.DragEvent, appointment: any) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, timeSlot?: Date) => {
    e.preventDefault();
    if (draggedAppointment) {
      const newStartTime = timeSlot || date;
      // TODO: Implement reschedule API call
      console.log('Reschedule appointment', draggedAppointment.id, 'to', newStartTime);
      setDraggedAppointment(null);
    }
  };

  const renderHeader = () => {
    const formatString = view === 'day' ? 'EEEE, MMMM d, yyyy' :
                        view === 'week' ? 'MMMM yyyy' :
                        'MMMM yyyy';

    return (
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{format(selectedDate, formatString)}</h2>
        <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = getTimeSlots();
    const dayAppointments = getAppointmentsForDate(selectedDate);

    return (
      <div className="flex-1 overflow-auto">
        {renderHeader()}
        <div className="flex">
          {/* Time column */}
          <div className="w-20 border-r border-border">
            {timeSlots.map((slot, index) => (
              <div key={index} className="h-15 border-b border-border flex items-center justify-center text-xs text-muted-foreground">
                {format(slot, 'HH:mm')}
              </div>
            ))}
          </div>
          
          {/* Appointments column */}
          <div className="flex-1 relative">
            {timeSlots.map((slot, index) => (
              <div
                key={index}
                className="h-15 border-b border-border hover:bg-accent/50 cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, selectedDate, slot)}
                onClick={() => {
                  // TODO: Open create appointment dialog with this time
                  console.log('Create appointment at', slot);
                }}
              />
            ))}
            
            {/* Appointments */}
            {dayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                style={getAppointmentStyle(appointment)}
                className="px-2"
              >
                <AppointmentCard
                  appointment={appointment}
                  onDragStart={(e) => handleDragStart(e, appointment)}
                  compact={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getViewDates();
    const timeSlots = getTimeSlots();

    return (
      <div className="flex-1 overflow-auto">
        {renderHeader()}
        <div className="flex">
          {/* Time column */}
          <div className="w-20 border-r border-border">
            <div className="h-12 border-b border-border" /> {/* Header spacer */}
            {timeSlots.map((slot, index) => (
              <div key={index} className="h-15 border-b border-border flex items-center justify-center text-xs text-muted-foreground">
                {format(slot, 'HH:mm')}
              </div>
            ))}
          </div>
          
          {/* Days columns */}
          {weekDates.map((date) => {
            const dayAppointments = getAppointmentsForDate(date);
            return (
              <div key={date.toISOString()} className="flex-1 border-r border-border">
                {/* Day header */}
                <div className={cn(
                  "h-12 border-b border-border flex flex-col items-center justify-center text-sm",
                  isSameDay(date, new Date()) && "bg-primary text-primary-foreground"
                )}>
                  <span className="font-medium">{format(date, 'EEE')}</span>
                  <span className="text-xs">{format(date, 'd')}</span>
                </div>
                
                {/* Time grid */}
                <div className="relative">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="h-15 border-b border-border hover:bg-accent/50 cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, date, slot)}
                      onClick={() => {
                        // TODO: Open create appointment dialog
                        console.log('Create appointment at', date, slot);
                      }}
                    />
                  ))}
                  
                  {/* Appointments */}
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      style={getAppointmentStyle(appointment)}
                      className="px-1"
                    >
                      <AppointmentCard
                        appointment={appointment}
                        onDragStart={(e) => handleDragStart(e, appointment)}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getViewDates();
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="flex-1 overflow-auto">
        {renderHeader()}
        
        {/* Week headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1">
          {monthDates.map((date) => {
            const dayAppointments = getAppointmentsForDate(date);
            const isCurrentMonth = isSameMonth(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "border-r border-b border-border p-2 min-h-32 cursor-pointer hover:bg-accent/50",
                  !isCurrentMonth && "text-muted-foreground bg-muted/30",
                  isToday && "bg-primary/10"
                )}
                onClick={() => onDateSelect(date)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className={cn(
                  "text-sm mb-1",
                  isToday && "font-bold text-primary"
                )}>
                  {format(date, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onDragStart={(e) => handleDragStart(e, appointment)}
                      compact={true}
                      monthView={true}
                    />
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}
    </div>
  );
};