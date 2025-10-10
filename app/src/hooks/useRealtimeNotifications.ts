import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  data?: any;
  created_at: string;
  read_at?: string;
}

interface SLAAlert {
  workOrderId: string;
  workOrderNumber: string;
  customerName: string;
  stageName: string;
  hoursOverdue: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [slaAlerts, setSlaAlerts] = useState<SLAAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter(n => !n.read_at).length);
      }
    };

    fetchNotifications();

    // Set up real-time subscription for notifications
    const notificationChannel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    // Set up SLA monitoring
    const checkSLABreaches = async () => {
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          sla_due_at,
          priority,
          workflow_stage_id,
          customer:customers(first_name, last_name),
          workflow_stage:workflow_stages(name)
        `)
        .not('sla_due_at', 'is', null)
        .lt('sla_due_at', new Date().toISOString())
        .neq('status', 'COMPLETED');

      if (workOrders) {
        const alerts: SLAAlert[] = workOrders.map(wo => {
          const hoursOverdue = Math.floor(
            (new Date().getTime() - new Date(wo.sla_due_at).getTime()) / (1000 * 60 * 60)
          );
          
          return {
            workOrderId: wo.id,
            workOrderNumber: wo.work_order_number,
            customerName: `${wo.customer?.first_name} ${wo.customer?.last_name}`,
            stageName: wo.workflow_stage?.name || 'Unknown',
            hoursOverdue,
            priority: (wo.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium'
          };
        });

        setSlaAlerts(alerts);
      }
    };

    checkSLABreaches();
    const slaInterval = setInterval(checkSLABreaches, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      supabase.removeChannel(notificationChannel);
      clearInterval(slaInterval);
    };
  }, [toast]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    
    if (unreadIds.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    }
  };

  const dismissSlaAlert = (workOrderId: string) => {
    setSlaAlerts(prev => prev.filter(alert => alert.workOrderId !== workOrderId));
  };

  return {
    notifications,
    slaAlerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissSlaAlert,
  };
};