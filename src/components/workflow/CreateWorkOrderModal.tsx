import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiStepWizard } from '@/components/shared/MultiStepWizard';
import { useToast } from '@/hooks/use-toast';

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderCreated?: () => void;
}

interface WorkOrderFormData {
  title: string;
  description: string;
  customerId: string;
  vehicleId: string;
  priority: string;
  estimatedHours: number;
  services: Array<{
    name: string;
    description: string;
    hours: number;
  }>;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  open,
  onOpenChange,
  onWorkOrderCreated,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: '',
    description: '',
    customerId: '',
    vehicleId: '',
    priority: 'normal',
    estimatedHours: 0,
    services: [],
  });

  const steps = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Enter work order details',
      component: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Work Order Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Oil Change & Inspection"
            />
          </div>
          
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
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
        </div>
      )
    },
    {
      id: 'customer',
      title: 'Customer & Vehicle',
      description: 'Select customer and vehicle',
      component: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <Select value={formData.customerId} onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer1">John Doe</SelectItem>
                <SelectItem value="customer2">Jane Smith</SelectItem>
                <SelectItem value="customer3">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select value={formData.vehicleId} onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle1">2020 Toyota Camry - ABC123</SelectItem>
                <SelectItem value="vehicle2">2019 Honda Civic - XYZ789</SelectItem>
                <SelectItem value="vehicle3">2021 Ford F-150 - DEF456</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Add services to perform',
      component: (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Services will be added to this work order. You can modify them later.
          </div>
          
          <div className="border rounded-lg p-4 space-y-3">
            {formData.services.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No services added yet
              </div>
            ) : (
              formData.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                  </div>
                  <div className="text-sm font-medium">{service.hours}h</div>
                </div>
              ))
            )}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                services: [
                  ...prev.services,
                  { name: 'Oil Change', description: 'Standard oil and filter change', hours: 1 }
                ]
              }));
            }}
          >
            Add Sample Service
          </Button>
        </div>
      )
    }
  ];

  const handleSubmit = async () => {
    try {
      // Here you would typically call your API to create the work order
      console.log('Creating work order:', formData);
      
      toast({
        title: "Work Order Created",
        description: `Work order "${formData.title}" has been created successfully.`,
      });
      
      onWorkOrderCreated?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        customerId: '',
        vehicleId: '',
        priority: 'normal',
        estimatedHours: 0,
        services: [],
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Work Order</DialogTitle>
        </DialogHeader>
        
        <MultiStepWizard
          steps={steps}
          onComplete={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};