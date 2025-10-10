import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface WorkflowFilters {
  priorities: string[];
  statuses: string[];
  overdue: boolean;
  technicians: string[];
  dateFrom?: Date;
  dateTo?: Date;
  customers: string[];
}

interface WorkflowFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: WorkflowFilters;
  onFiltersChange: (filters: WorkflowFilters) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const TECHNICIAN_OPTIONS = [
  { value: 'tech1', label: 'John Smith' },
  { value: 'tech2', label: 'Mike Johnson' },
  { value: 'tech3', label: 'Sarah Wilson' },
];

export const WorkflowFiltersModal: React.FC<WorkflowFiltersModalProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<WorkflowFilters>(filters);

  const handlePriorityToggle = (priority: string) => {
    setLocalFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }));
  };

  const handleStatusToggle = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const handleTechnicianToggle = (technician: string) => {
    setLocalFilters(prev => ({
      ...prev,
      technicians: prev.technicians.includes(technician)
        ? prev.technicians.filter(t => t !== technician)
        : [...prev.technicians, technician]
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters: WorkflowFilters = {
      priorities: [],
      statuses: [],
      overdue: false,
      technicians: [],
      customers: [],
    };
    setLocalFilters(resetFilters);
  };

  const getActiveFilterCount = () => {
    return (
      localFilters.priorities.length +
      localFilters.statuses.length +
      localFilters.technicians.length +
      localFilters.customers.length +
      (localFilters.overdue ? 1 : 0) +
      (localFilters.dateFrom ? 1 : 0) +
      (localFilters.dateTo ? 1 : 0)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Advanced Filters
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()} active
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Priority Filter */}
          <div>
            <Label className="text-base font-medium">Priority</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PRIORITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={localFilters.priorities.includes(option.value)}
                    onCheckedChange={() => handlePriorityToggle(option.value)}
                  />
                  <Label
                    htmlFor={`priority-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Label className="text-base font-medium">Status</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.statuses.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Technicians Filter */}
          <div>
            <Label className="text-base font-medium">Technicians</Label>
            <div className="space-y-2 mt-2">
              {TECHNICIAN_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tech-${option.value}`}
                    checked={localFilters.technicians.includes(option.value)}
                    onCheckedChange={() => handleTechnicianToggle(option.value)}
                  />
                  <Label
                    htmlFor={`tech-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <Label className="text-base font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-sm">From</Label>
                <Input
                  type="date"
                  value={localFilters.dateFrom ? localFilters.dateFrom.toISOString().split('T')[0] : ''}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                />
              </div>
              <div>
                <Label className="text-sm">To</Label>
                <Input
                  type="date"
                  value={localFilters.dateTo ? localFilters.dateTo.toISOString().split('T')[0] : ''}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    dateTo: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Overdue Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overdue"
              checked={localFilters.overdue}
              onCheckedChange={(checked) => 
                setLocalFilters(prev => ({ ...prev, overdue: !!checked }))
              }
            />
            <Label htmlFor="overdue" className="text-sm font-medium text-destructive">
              Show only overdue work orders
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};