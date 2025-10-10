import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { handleSupabaseError, validateFormData } from '@/lib/errorHandling';
import { LoadingButton } from '@/components/shared/LoadingButton';

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
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

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  open,
  onOpenChange,
  onWorkOrderCreated,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerId: '',
    vehicleId: '',
    stageId: '',
    priority: 'normal',
    estimatedHours: 2,
  });

  // Fetch data on modal open
  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchStages();
    }
  }, [open]);

  // Fetch vehicles when customer changes
  useEffect(() => {
    if (formData.customerId) {
      fetchVehicles(formData.customerId);
    } else {
      setVehicles([]);
    }
  }, [formData.customerId]);

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

  const fetchVehicles = async (customerId: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate')
      .eq('customer_id', customerId)
      .order('year', { ascending: false });
      
    if (!error && data) {
      setVehicles(data);
    }
  };

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from('workflow_stages')
      .select('*')
      .order('sort_order', { ascending: true });
      
    if (!error && data) {
      setStages(data);
      // Set default stage
      if (data.length > 0 && !formData.stageId) {
        setFormData(prev => ({ ...prev, stageId: data[0].id }));
      }
    }
  };

  const handleSubmit = async () => {
    // Enhanced validation
    const validationErrors = validateFormData(
      { title: formData.title, customer: formData.customerId },
      ['title', 'customer']
    );

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: Object.values(validationErrors)[0],
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get user org_id and user_id
      const { data: orgId } = await supabase.rpc('get_user_org_id');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!orgId || !user) {
        throw new Error('User authentication required');
      }

      // Generate work order number
      const { data: woNumber } = await supabase.rpc('generate_next_number', {
        entity_type_param: 'work_order',
        org_id_param: orgId,
        location_id_param: null
      });

      if (!woNumber) {
        throw new Error('Failed to generate work order number');
      }

      // Create work order
      const { error: woError } = await supabase
        .from('work_orders')
        .insert({
          org_id: orgId,
          created_by: user.id,
          work_order_number: woNumber,
          title: formData.title,
          description: formData.description,
          customer_id: formData.customerId,
          vehicle_id: formData.vehicleId || null,
          workflow_stage_id: formData.stageId,
          priority: formData.priority,
          estimated_hours: formData.estimatedHours,
          status: 'DRAFT',
          stage_entered_at: new Date().toISOString()
        });

      if (woError) throw woError;

      toast({
        title: "Success",
        description: `Work order ${woNumber} created successfully`
      });

      onWorkOrderCreated?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        customerId: '',
        vehicleId: '',
        stageId: stages[0]?.id || '',
        priority: 'normal',
        estimatedHours: 2,
      });
    } catch (error: any) {
      console.error('Error creating work order:', error);
      const errorInfo = handleSupabaseError(error, 'creating work order');
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Work Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Oil Change & Inspection"
            />
          </div>
          
          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of work to be performed..."
              rows={3}
            />
          </div>

          {/* Customer */}
          <div>
            <Label>Customer *</Label>
            <Select value={formData.customerId} onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value, vehicleId: '' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name}
                    {customer.phone && ` • ${customer.phone}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle */}
          {formData.customerId && (
            <div>
              <Label>Vehicle</Label>
              <Select value={formData.vehicleId} onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.year || ''} {vehicle.make} {vehicle.model}
                      {vehicle.license_plate && ` • ${vehicle.license_plate}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
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
            
            {/* Estimated Hours */}
            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                placeholder="2.5"
              />
            </div>
          </div>

          {/* Stage */}
          <div>
            <Label>Initial Stage</Label>
            <Select value={formData.stageId} onValueChange={(value) => setFormData(prev => ({ ...prev, stageId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <LoadingButton onClick={handleSubmit} loading={loading} loadingText="Creating...">
              Create Work Order
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
