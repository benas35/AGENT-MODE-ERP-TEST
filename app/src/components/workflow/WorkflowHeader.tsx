import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar, Filter, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import { WorkflowFiltersModal } from './WorkflowFiltersModal';
import { NotificationCenter } from './NotificationCenter';

interface WorkflowFilters {
  priorities: string[];
  statuses: string[];
  overdue: boolean;
  technicians: string[];
  dateFrom?: Date;
  dateTo?: Date;
  customers: string[];
}

interface WorkflowHeaderProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedTechnician: string;
  onTechnicianChange: (technician: string) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  onRefresh?: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  selectedLocation,
  onLocationChange,
  selectedTechnician,
  onTechnicianChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState<WorkflowFilters>({
    priorities: [],
    statuses: [],
    overdue: false,
    technicians: [],
    customers: [],
  });
  return (
    <div>
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow</h1>
            <p className="text-muted-foreground">
              Manage your work orders through the service workflow
            </p>
          </div>
          
          {/* Notification Center */}
          <NotificationCenter />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFiltersModal(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Calendar view clicked');
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateWorkOrderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onWorkOrderCreated={onRefresh}
      />

      <WorkflowFiltersModal
        open={showFiltersModal}
        onOpenChange={setShowFiltersModal}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};