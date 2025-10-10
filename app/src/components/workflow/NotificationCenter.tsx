import React from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    slaAlerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissSlaAlert,
  } = useRealtimeNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-info" />;
    }
  };

  const getSLAPriorityColor = (priority: string, hoursOverdue: number) => {
    if (hoursOverdue > 24) return 'bg-destructive';
    if (hoursOverdue > 8) return 'bg-warning';
    if (priority === 'urgent') return 'bg-destructive';
    if (priority === 'high') return 'bg-warning';
    return 'bg-info';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {(unreadCount > 0 || slaAlerts.length > 0) && (
            <Badge 
              className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 text-xs"
              variant="destructive"
            >
              {unreadCount + slaAlerts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {(unreadCount > 0 || slaAlerts.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="max-h-96">
          {/* SLA Alerts */}
          {slaAlerts.map((alert) => (
            <div
              key={alert.workOrderId}
              className={cn(
                "p-3 border-l-4 mb-2 mx-2 rounded-r",
                getSLAPriorityColor(alert.priority, alert.hoursOverdue)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-sm">SLA Breach</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Work Order #{alert.workOrderNumber}
                  </p>
                  <p className="text-sm">{alert.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.hoursOverdue}h overdue in {alert.stageName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissSlaAlert(alert.workOrderId)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Regular Notifications */}
          {notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50",
                !notification.read_at && "bg-primary/5"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{notification.title}</p>
                  {!notification.read_at && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </DropdownMenuItem>
          ))}

          {notifications.length === 0 && slaAlerts.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};