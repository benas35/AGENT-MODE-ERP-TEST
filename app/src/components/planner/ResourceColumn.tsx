import React from 'react';
import { format } from 'date-fns';
import { MoreVertical, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  name: string;
  type: 'TECHNICIAN' | 'BAY';
  color: string;
  active: boolean;
  meta: any;
}

interface ResourceColumnProps {
  resource?: Resource;
  isUnassigned?: boolean;
  utilization?: number;
  appointmentsCount?: number;
}

export const ResourceColumn = ({ 
  resource, 
  isUnassigned = false, 
  utilization = 0, 
  appointmentsCount = 0 
}: ResourceColumnProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUtilizationColor = (value: number) => {
    if (value >= 90) return 'bg-destructive';
    if (value >= 70) return 'bg-warning';
    if (value >= 50) return 'bg-info';
    return 'bg-success';
  };

  if (isUnassigned) {
    return (
      <div className="min-w-48 border-r border-border">
        <div className="h-16 border-b border-border flex flex-col items-center justify-center p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm text-muted-foreground">Unassigned</span>
          </div>
          {appointmentsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {appointmentsCount} items
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (!resource) return null;

  return (
    <div className="min-w-48 border-r border-border">
      <div className="h-16 border-b border-border flex flex-col items-center justify-center p-3 bg-card">
        <div className="flex items-center justify-between w-full mb-1">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={resource.meta?.avatar_url} />
              <AvatarFallback 
                className="text-xs font-medium"
                style={{ backgroundColor: resource.color || '#3B82F6', color: 'white' }}
              >
                {getInitials(resource.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm truncate max-w-24">{resource.name}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Set unavailable</DropdownMenuItem>
              <DropdownMenuItem>View profile</DropdownMenuItem>
              <DropdownMenuItem>Filter by this resource</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Utilization</span>
            <span>{utilization}%</span>
          </div>
          <Progress 
            value={utilization} 
            className={cn("h-1.5", getUtilizationColor(utilization))}
          />
        </div>
      </div>
    </div>
  );
};