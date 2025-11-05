import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { AppointmentBlock } from './AppointmentBlock';
import { cn } from '@/lib/utils';

interface WorkZone {
  id: string;
  name: string;
  code: string;
  capacity: number;
  color: string;
  description?: string;
}

interface Appointment {
  id: string;
  title: string;
  start_time: string;  
  end_time: string;
  status: string;
  priority: string;
  customer?: {
    first_name: string;
    last_name: string;
  };
  vehicle?: {
    year?: number;
    make: string;
    model: string;
  };
}

interface WorkZoneBoardProps {
  workZone: WorkZone;
  appointments: Appointment[];
  utilization: number;
  onAppointmentClick?: (appointmentId: string) => void;
}

export const WorkZoneBoard: React.FC<WorkZoneBoardProps> = ({
  workZone,
  appointments,
  utilization,
  onAppointmentClick
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: workZone.color }}
            />
            {workZone.name}
          </CardTitle>
          <Badge variant={utilization > 90 ? 'destructive' : utilization > 70 ? 'default' : 'secondary'}>
            {utilization.toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Capacity: {workZone.capacity}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {appointments.length} jobs
          </span>
        </div>
        {workZone.description && (
          <p className="text-sm text-muted-foreground">{workZone.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Droppable droppableId={`zone-${workZone.id}`}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "min-h-48 space-y-2 p-2 rounded-md transition-colors",
                snapshot.isDraggingOver && "bg-accent/50"
              )}
            >
              {appointments.map((appointment, index) => (
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
                        "transition-transform cursor-pointer",
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
              {appointments.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-border rounded-md">
                  No appointments scheduled
                </div>
              )}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
};