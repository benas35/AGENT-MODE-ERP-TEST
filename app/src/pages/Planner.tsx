import React, { useState } from 'react';
import { Calendar, Clock, Users, MapPin, Plus, Filter, Search, Grid3X3, List, Eye, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { ResourceTimeline } from '@/components/planner/ResourceTimeline';
import { CreateAppointmentModal } from '@/components/planner/CreateAppointmentModal';
import { MiniCalendar } from '@/components/planner/MiniCalendar';
import { CapacityIndicator } from '@/components/planner/CapacityIndicator';
import { AdvancedPlannerBoard } from '@/components/planner/AdvancedPlannerBoard';
import { ColumnarPlannerView } from '@/components/planner/ColumnarPlannerView';
import { useTechnicians } from '@/hooks/useTechnicians';

const Planner = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'timeline'>('day');
  const [plannerLayout, setPlannerLayout] = useState<'columnar' | 'timeline'>('columnar');
  const [selectedResource, setSelectedResource] = useState<'all' | 'technicians' | 'bays'>('technicians');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const { technicians, loading: techniciansLoading } = useTechnicians();

  const handleViewChange = (view: 'day' | 'week' | 'month' | 'timeline') => {
    setCurrentView(view);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateAppointment = (appointmentData: any) => {
    console.log('Creating appointment:', appointmentData);
    // TODO: Implement appointment creation API call
    setShowCreateDialog(false);
  };

  const quickActions = [
    { label: 'Oil Change', color: 'bg-emerald-500', duration: '30 min' },
    { label: 'Brake Service', color: 'bg-amber-500', duration: '90 min' },
    { label: 'Inspection', color: 'bg-blue-500', duration: '60 min' },
    { label: 'Diagnostics', color: 'bg-red-500', duration: '120 min' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Planner</h1>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search appointments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Location Filter */}
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="main">Main Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mini Calendar */}
        <div className="p-4 border-b border-border">
          <MiniCalendar 
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Quick Book</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="sm"
                className="h-auto p-3 flex flex-col items-start gap-1 border border-border hover:bg-accent"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className={`w-3 h-3 rounded-full ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.duration}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Capacity Overview */}
        <div className="p-4 flex-1">
          <h3 className="text-sm font-medium text-foreground mb-3">Today's Capacity</h3>
          {techniciansLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded"></div>
            </div>
          ) : technicians.length > 0 ? (
            <div className="space-y-3">
              {technicians.map((tech) => (
                <div key={tech.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tech.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{tech.display_name}</div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: '45%' }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">45%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active technicians</p>
              <Button variant="outline" size="sm" className="mt-2">
                Add Technician
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <PlannerHeader
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          view={currentView}
          onViewChange={handleViewChange}
          resourceFilter={selectedResource}
          onResourceFilterChange={setSelectedResource}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onCreateNew={() => setShowCreateDialog(true)}
        />

        {/* Calendar Views */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'day' && plannerLayout === 'columnar' ? (
            <ColumnarPlannerView
              selectedDate={selectedDate}
              resourceType={selectedResource === 'technicians' ? 'technicians' : 'workzones'}
              searchQuery={searchQuery}
              onAppointmentClick={(appointmentId) => {
                console.log('Appointment clicked:', appointmentId);
                // TODO: Implement appointment details modal
              }}
            />
          ) : currentView === 'timeline' || plannerLayout === 'timeline' ? (
            <ResourceTimeline
              selectedDate={selectedDate}
              resourceFilter={selectedResource}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="h-full p-6 overflow-auto">
              <AdvancedPlannerBoard
                selectedDate={selectedDate}
                view={currentView}
                onDateSelect={handleDateSelect}
                onAppointmentClick={(appointmentId) => {
                  console.log('Appointment clicked:', appointmentId);
                  // TODO: Implement appointment details modal
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Appointment Dialog */}
      <CreateAppointmentModal
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedDate={selectedDate}
        onSuccess={() => setShowCreateDialog(false)}
      />
    </div>
  );
};

export default Planner;
