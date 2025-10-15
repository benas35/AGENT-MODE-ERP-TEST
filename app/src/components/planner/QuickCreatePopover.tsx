import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, User, Car, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface QuickCreatePopoverProps {
  children: React.ReactNode;
  selectedDate: Date;
  selectedTime: Date;
  resourceId?: string;
  onCreateAppointment: (data: any) => void;
}

const appointmentTypes = [
  { id: 'oil-change', name: 'Oil Change', duration: 30, color: '#10B981' },
  { id: 'brake-service', name: 'Brake Service', duration: 90, color: '#F59E0B' },
  { id: 'inspection', name: 'Inspection', duration: 60, color: '#3B82F6' },
  { id: 'diagnostics', name: 'Diagnostics', duration: 120, color: '#EF4444' },
];

export const QuickCreatePopover = ({ 
  children, 
  selectedDate, 
  selectedTime, 
  resourceId,
  onCreateAppointment 
}: QuickCreatePopoverProps) => {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [duration, setDuration] = useState(60);

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const type = appointmentTypes.find(t => t.id === typeId);
    if (type) {
      setDuration(type.duration);
    }
  };

  const handleQuickCreate = () => {
    const endTime = new Date(selectedTime);
    endTime.setMinutes(endTime.getMinutes() + duration);

    const appointmentData = {
      title: appointmentTypes.find(t => t.id === selectedType)?.name || 'New Appointment',
      start_time: selectedTime.toISOString(),
      end_time: endTime.toISOString(),
      customer_search: customer,
      vehicle_search: vehicle,
      type_id: selectedType,
      resource_id: resourceId,
    };

    onCreateAppointment(appointmentData);
    setOpen(false);
    setCustomer('');
    setVehicle('');
    setSelectedType('');
    setDuration(60);
  };

  const handleMoreOptions = () => {
    // Open full appointment dialog
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Quick Book</h4>
            <Badge variant="secondary" className="text-xs">
              {format(selectedTime, 'MMM d, HH:mm')}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {appointmentTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange(type.id)}
                className="h-auto p-2 flex flex-col items-start gap-1"
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-xs font-medium">{type.name}</span>
                <span className="text-xs text-muted-foreground">{type.duration}m</span>
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="customer" className="text-xs">Customer</Label>
              <Input
                id="customer"
                placeholder="Search or enter name..."
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="vehicle" className="text-xs">Vehicle</Label>
              <Input
                id="vehicle"
                placeholder="License plate or VIN..."
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="duration" className="text-xs">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleQuickCreate}
              className="flex-1"
              disabled={!selectedType || !customer}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book
            </Button>
            <Button variant="outline" onClick={handleMoreOptions}>
              More...
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};