import React from 'react';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, Filter, Search, Plus, Layout, Grid, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlannerHeaderProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  view: 'day' | 'week' | 'month' | 'timeline';
  onViewChange: (view: 'day' | 'week' | 'month' | 'timeline') => void;
  resourceFilter: 'all' | 'technicians' | 'bays';
  onResourceFilterChange: (filter: 'all' | 'technicians' | 'bays') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onCreateNew: () => void;
}

export const PlannerHeader = ({
  selectedDate,
  onDateSelect,
  view,
  onViewChange,
  resourceFilter,
  onResourceFilterChange,
  searchQuery,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  onCreateNew
}: PlannerHeaderProps) => {
  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = view === 'day' ? 1 : view === 'week' ? 7 : 30;
    const newDate = addDays(selectedDate, direction === 'next' ? amount : -amount);
    onDateSelect(newDate);
  };

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between p-4">
        {/* Left section - Navigation and controls */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => onDateSelect(new Date())}>
            Today
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Tabs */}
          <Tabs value={view} onValueChange={(value) => onViewChange(value as any)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Resource Filter */}
          <Select value={resourceFilter} onValueChange={(value) => onResourceFilterChange(value as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="technicians">Technicians</SelectItem>
              <SelectItem value="bays">Service Bays</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="main">Main Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Center - Current date */}
        <h2 className="text-lg font-semibold">
          {format(selectedDate, view === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')}
        </h2>

        {/* Right section - Timezone, filters, and new button */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Europe/Vilnius
          </Badge>
          
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Layout className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch Layout: Columnar ⇄ Timeline</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter by tech, zone, status, priority</p>
                </TooltipContent>
              </Tooltip>
              
              <Button onClick={onCreateNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};