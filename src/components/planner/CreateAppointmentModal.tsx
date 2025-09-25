import React, { useState, useEffect } from 'react';
import { format, addMinutes } from 'date-fns';
import { Calendar, Clock, User, Car, Wrench, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useResources } from '@/hooks/useResources';
import { useWorkZones } from '@/hooks/useWorkZones';

interface CreateAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  initialStartTime?: Date;
  initialEndTime?: Date;
  initialResourceId?: string;
  initialWorkZoneId?: string;
  onSuccess?: () => void;
}

interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  default_duration_minutes: number;
  estimated_hours: number;
  operations: any;
  color: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number;
  license_plate?: string;
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onOpenChange,
  selectedDate,
  initialStartTime,
  initialEndTime,
  initialResourceId,
  initialWorkZoneId,
  onSuccess
}) => {
  const { toast } = useToast();
  const { resources } = useResources('all');
  const { workZones } = useWorkZones();
  
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedResourceId, setSelectedResourceId] = useState<string>(initialResourceId || '');
  const [selectedWorkZoneId, setSelectedWorkZoneId] = useState<string>(initialWorkZoneId || '');
  
  const [formData, setFormData] = useState({
    title: '',
    startTime: initialStartTime || new Date(),
    endTime: initialEndTime || addMinutes(initialStartTime || new Date(), 60),
    priority: 'normal',
    notes: '',
    requireEsign: false,
    blockUntilPartsReady: false,
    createEstimate: false,
    createWorkOrder: false
  });
  
  const [loading, setLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Fetch data on modal open
  useEffect(() => {
    if (open) {
      fetchServiceTemplates();
      fetchCustomers();
      fetchVehicles();
    }
  }, [open]);

  // Update form when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = serviceTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const duration = template.default_duration_minutes;
        setFormData(prev => ({
          ...prev,
          title: template.name,
          endTime: addMinutes(prev.startTime, duration)
        }));
      }
    }
  }, [selectedTemplateId, serviceTemplates]);

  const fetchServiceTemplates = async () => {
    const { data, error } = await supabase
      .from('service_templates')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });
      
    if (!error && data) {
      setServiceTemplates(data);
    }
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .order('first_name', { ascending: true })
      .limit(50);
      
    if (!error && data) {
      setCustomers(data);
    }
  };

  const fetchVehicles = async () => {
    if (!selectedCustomerId) return;
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate')
      .eq('customer_id', selectedCustomerId)
      .order('year', { ascending: false });
      
    if (!error && data) {
      setVehicles(data);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [selectedCustomerId]);

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);
    
    if (field === 'startTime') {
      const duration = formData.endTime.getTime() - formData.startTime.getTime();
      setFormData(prev => ({
        ...prev,
        startTime: newDate,
        endTime: new Date(newDate.getTime() + duration)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        endTime: newDate
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !selectedCustomerId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get user org_id and user_id first
      const { data: orgId } = await supabase.rpc('get_user_org_id');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!orgId || !user) {
        throw new Error('User authentication required');
      }
      
      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          org_id: orgId,
          created_by: user.id,
          title: formData.title,
          start_time: formData.startTime.toISOString(),
          end_time: formData.endTime.toISOString(),
          customer_id: selectedCustomerId,
          vehicle_id: selectedVehicleId || null,
          work_zone_id: selectedWorkZoneId || null,
          priority: formData.priority,
          notes: formData.notes,
          status: 'SCHEDULED'
        } as any)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Assign resources if selected
      if (selectedResourceId && appointment && orgId) {
        await supabase
          .from('appointment_resources')
          .insert({
            appointment_id: appointment.id,
            resource_id: selectedResourceId,
            org_id: orgId
          });
      }

      // Create appointment operations from template
      if (selectedTemplateId && appointment && orgId && user) {
        const template = serviceTemplates.find(t => t.id === selectedTemplateId);
        if (template?.operations && Array.isArray(template.operations)) {
          const operations = template.operations.map((op: any, index: number) => ({
            appointment_id: appointment.id,
            org_id: orgId,
            created_by: user.id,
            name: op.name,
            description: op.description || '',
            estimated_hours: (op.duration || 60) / 60,
            position: index
          }));

          await supabase
            .from('appointment_operations')
            .insert(operations as any);
        }
      }

      // Create estimate if requested
      if (formData.createEstimate && appointment && orgId && user) {
        const { data: estimateNumber } = await supabase.rpc('generate_next_number', {
          entity_type_param: 'estimate',
          org_id_param: orgId,
          location_id_param: appointment.location_id
        });

        await supabase
          .from('estimates')
          .insert({
            estimate_number: estimateNumber,
            org_id: orgId,
            created_by: user.id,
            customer_id: selectedCustomerId,
            vehicle_id: selectedVehicleId || null,
            title: `Estimate for ${formData.title}`,
            status: 'DRAFT'
          } as any);
      }

      toast({
        title: "Success",
        description: "Appointment created successfully"
      });

      onSuccess?.();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const filteredVehicles = vehicles.filter(v =>
    `${v.year || ''} ${v.make} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.license_plate?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{format(selectedDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={format(formData.startTime, 'HH:mm')}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={format(formData.endTime, 'HH:mm')}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
              />
            </div>
          </div>

          {/* Service Template */}
          <div>
            <Label>Service Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service template..." />
              </SelectTrigger>
              <SelectContent>
                {serviceTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: template.color }}
                      />
                      <span>{template.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {template.default_duration_minutes}min
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Service appointment title..."
            />
          </div>

          {/* Customer */}
          <div>
            <Label>Customer *</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{customer.first_name} {customer.last_name}</span>
                        {customer.phone && (
                          <span className="text-muted-foreground">• {customer.phone}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle */}
          {selectedCustomerId && (
            <div>
              <Label>Vehicle</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search vehicles..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <span>
                            {vehicle.license_plate ? `${vehicle.license_plate} • ` : ''}
                            {vehicle.year || ''} {vehicle.make} {vehicle.model}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Technician</Label>
              <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign technician..." />
                </SelectTrigger>
                <SelectContent>
                  {resources
                    .filter(r => r.type === 'TECHNICIAN')
                    .map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tech.color }}
                          />
                          <span>{tech.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Work Zone</Label>
              <Select value={selectedWorkZoneId} onValueChange={setSelectedWorkZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign work zone..." />
                </SelectTrigger>
                <SelectContent>
                  {workZones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span>{zone.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority & Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requireEsign"
                    checked={formData.requireEsign}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireEsign: !!checked }))}
                  />
                  <Label htmlFor="requireEsign" className="text-sm">Require E-Signature</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="blockUntilPartsReady"
                    checked={formData.blockUntilPartsReady}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, blockUntilPartsReady: !!checked }))}
                  />
                  <Label htmlFor="blockUntilPartsReady" className="text-sm">Block until parts ready</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Label>Create Additional Items</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="createEstimate"
                  checked={formData.createEstimate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createEstimate: !!checked }))}
                />
                <Label htmlFor="createEstimate" className="text-sm">Create linked Estimate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="createWorkOrder"
                  checked={formData.createWorkOrder}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createWorkOrder: !!checked }))}
                />
                <Label htmlFor="createWorkOrder" className="text-sm">Create Work Order</Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};