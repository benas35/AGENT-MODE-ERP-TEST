import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Car, Phone, Mail, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  appointment?: any; // For editing existing appointments
}

export const AppointmentDialog = ({ open, onOpenChange, selectedDate, appointment }: AppointmentDialogProps) => {
  const [step, setStep] = useState<'details' | 'customer' | 'services' | 'confirm'>('details');
  const [formData, setFormData] = useState({
    title: appointment?.title || '',
    description: appointment?.description || '',
    startTime: appointment?.start_time ? format(new Date(appointment.start_time), 'HH:mm') : '09:00',
    endTime: appointment?.end_time ? format(new Date(appointment.end_time), 'HH:mm') : '10:00',
    type: appointment?.type_id || '',
    priority: appointment?.priority || 'normal',
    source: appointment?.source || 'phone',
    customerId: appointment?.customer_id || '',
    vehicleId: appointment?.vehicle_id || '',
    technicianId: '',
    bayId: '',
    notes: appointment?.notes || '',
    sendConfirmation: true,
    services: []
  });

  // Mock data - in real app this would come from APIs
  const appointmentTypes = [
    { id: '1', name: 'Oil Change', duration: 30, color: '#10B981' },
    { id: '2', name: 'Brake Service', duration: 90, color: '#F59E0B' },
    { id: '3', name: 'Tire Service', duration: 45, color: '#8B5CF6' },
    { id: '4', name: 'General Inspection', duration: 60, color: '#3B82F6' },
    { id: '5', name: 'Engine Diagnostics', duration: 120, color: '#EF4444' },
  ];

  const customers = [
    { id: '1', name: 'John Smith', phone: '+1 555-0123', email: 'john@example.com' },
    { id: '2', name: 'Jane Doe', phone: '+1 555-0124', email: 'jane@example.com' },
  ];

  const vehicles = [
    { id: '1', customerId: '1', info: '2022 Toyota Camry - ABC123' },
    { id: '2', customerId: '2', info: '2021 Honda Civic - XYZ789' },
  ];

  const technicians = [
    { id: '1', name: 'Mike Johnson', specialties: ['engine', 'diagnostics'] },
    { id: '2', name: 'Sarah Wilson', specialties: ['brakes', 'suspension'] },
  ];

  const bays = [
    { id: '1', name: 'Bay 1 - Quick Service', type: 'Quick Service' },
    { id: '2', name: 'Bay 2 - Heavy Duty', type: 'Heavy Duty' },
  ];

  const handleNext = () => {
    const steps = ['details', 'customer', 'services', 'confirm'] as const;
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps = ['details', 'customer', 'services', 'confirm'] as const;
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      // TODO: Implement appointment creation/update API call
      console.log('Creating/updating appointment:', formData);
      onOpenChange(false);
      setStep('details');
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'details', label: 'Details', icon: FileText },
      { key: 'customer', label: 'Customer', icon: User },
      { key: 'services', label: 'Services', icon: Car },
      { key: 'confirm', label: 'Confirm', icon: CheckCircle },
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-6">
        {steps.map((stepItem, index) => {
          const Icon = stepItem.icon;
          const isActive = step === stepItem.key;
          const isCompleted = steps.findIndex(s => s.key === step) > index;
          
          return (
            <div key={stepItem.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                ${!isActive && !isCompleted ? 'border-muted-foreground text-muted-foreground' : ''}
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepItem.label}
              </span>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Oil Change Service"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Service Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {appointmentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                    {type.name} ({type.duration} min)
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            readOnly
            className="bg-muted"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional details about the appointment..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderCustomerStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Customer</Label>
        <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.phone}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vehicle">Vehicle</Label>
        <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles
              .filter(v => !formData.customerId || v.customerId === formData.customerId)
              .map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.info}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="technician">Technician</Label>
          <Select value={formData.technicianId} onValueChange={(value) => setFormData({ ...formData, technicianId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  <div>
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-sm text-muted-foreground">{tech.specialties.join(', ')}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bay">Service Bay</Label>
          <Select value={formData.bayId} onValueChange={(value) => setFormData({ ...formData, bayId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select bay" />
            </SelectTrigger>
            <SelectContent>
              {bays.map((bay) => (
                <SelectItem key={bay.id} value={bay.id}>
                  {bay.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderServicesStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Services</h3>
        <Button variant="outline" size="sm">
          <Car className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Services will be automatically populated based on the selected appointment type.
        You can add additional services here.
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No additional services added</p>
            <p className="text-xs">Services from the appointment type will be included automatically</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmStep = () => {
    const selectedType = appointmentTypes.find(t => t.id === formData.type);
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
    const selectedTechnician = technicians.find(t => t.id === formData.technicianId);
    const selectedBay = bays.find(b => b.id === formData.bayId);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">Review Appointment Details</h3>
          <p className="text-muted-foreground">Please review all details before confirming</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="font-medium">{formData.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date & Time</Label>
                <p className="font-medium">
                  {format(selectedDate, 'MMM d, yyyy')} at {formData.startTime} - {formData.endTime}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="flex items-center gap-2">
                  {selectedType && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedType.color }} />
                  )}
                  <span className="font-medium">{selectedType?.name}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Badge variant={formData.priority === 'urgent' ? 'destructive' : 'secondary'}>
                  {formData.priority}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer & Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Customer</Label>
                <p className="font-medium">{selectedCustomer?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCustomer?.phone}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vehicle</Label>
                <p className="font-medium">{selectedVehicle?.info}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Technician</Label>
                <p className="font-medium">{selectedTechnician?.name || 'Not assigned'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bay</Label>
                <p className="font-medium">{selectedBay?.name || 'Not assigned'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="confirmation"
            checked={formData.sendConfirmation}
            onCheckedChange={(checked) => setFormData({ ...formData, sendConfirmation: checked })}
          />
          <Label htmlFor="confirmation" className="text-sm">
            Send confirmation email/SMS to customer
          </Label>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Edit Appointment' : 'Create New Appointment'}
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[400px]">
          {step === 'details' && renderDetailsStep()}
          {step === 'customer' && renderCustomerStep()}
          {step === 'services' && renderServicesStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step !== 'details' && (
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {step === 'confirm' ? (
              <Button onClick={handleSubmit}>
                {appointment ? 'Update Appointment' : 'Create Appointment'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};