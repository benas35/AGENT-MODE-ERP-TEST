import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useNotificationPreferences,
  type NotificationPreferencesState,
} from "@/hooks/useNotificationPreferences";
import type { Notification as NotificationRecord } from "@/types/database";

interface SLAAlert {
  workOrderId: string;
  workOrderNumber: string;
  customerName: string;
  stageName: string;
  hoursOverdue: number;
  priority: "low" | "medium" | "high" | "urgent";
}

const shouldIncludeNotification = (
  notification: NotificationRecord,
  preferences: NotificationPreferencesState,
) => {
  const type = notification.type?.toLowerCase() ?? "";

  if (type.includes("appointment")) {
    return preferences.appointmentReminders;
  }

  if (type.includes("work_order") && type.includes("overdue")) {
    return preferences.overdueAlerts;
  }

  if (type.includes("inventory")) {
    return preferences.lowInventoryAlerts;
  }

  if (type.includes("report.daily")) {
    return preferences.dailyReports;
  }

  if (type.includes("report.weekly")) {
    return preferences.weeklyReports;
  }

  return true;
};

const buildCustomerName = (entry: {
  customer?: { first_name?: string | null; last_name?: string | null } | null;
}) => {
  const first = entry.customer?.first_name ?? "";
  const last = entry.customer?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full.length > 0 ? full : "Unknown";
};

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [slaAlerts, setSlaAlerts] = useState<SLAAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { preferences } = useNotificationPreferences();

  const preferenceKey = useMemo(
    () => JSON.stringify(preferences),
    [preferences],
  );

  useEffect(() => {
    const parsedPreferences = JSON.parse(
      preferenceKey,
    ) as NotificationPreferencesState;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data) {
        return;
      }

      const filtered = (data as NotificationRecord[]).filter((notification) =>
        shouldIncludeNotification(notification, parsedPreferences),
      );
      setNotifications(filtered);
      setUnreadCount(filtered.filter((notification) => !notification.read_at).length);
    };

    fetchNotifications();

    const notificationChannel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as NotificationRecord;

          if (!shouldIncludeNotification(newNotification, parsedPreferences)) {
            return;
          }

          setNotifications((current) => [newNotification, ...current]);
          setUnreadCount((current) => current + 1);

          const variant = newNotification.type?.toLowerCase().includes("error")
            ? "destructive"
            : "default";

          toast({
            title: newNotification.title ?? "Notification",
            description: newNotification.message ?? "",
            variant,
          });
        },
      )
      .subscribe();

    const checkSlaBreaches = async () => {
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select(
          `
          id,
          work_order_number,
          sla_due_at,
          priority,
          workflow_stage_id,
          customer:customers(first_name, last_name),
          workflow_stage:workflow_stages(name)
        `,
        )
        .not("sla_due_at", "is", null)
        .lt("sla_due_at", new Date().toISOString())
        .neq("status", "COMPLETED");

      if (!workOrders) {
        return;
      }

      const alerts: SLAAlert[] = workOrders.map((workOrder) => {
        const overdueMs = new Date().getTime() - new Date(workOrder.sla_due_at).getTime();
        const hoursOverdue = Math.max(0, Math.floor(overdueMs / (1000 * 60 * 60)));

        return {
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.work_order_number,
          customerName: buildCustomerName(workOrder),
          stageName: workOrder.workflow_stage?.name ?? "Unknown",
          hoursOverdue,
          priority: (workOrder.priority as SLAAlert["priority"]) ?? "medium",
        };
      });

      setSlaAlerts(parsedPreferences.overdueAlerts ? alerts : []);
    };

    checkSlaBreaches();
    const slaInterval = window.setInterval(checkSlaBreaches, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(notificationChannel);
      window.clearInterval(slaInterval);
    };
  }, [toast, preferenceKey]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);

    if (error) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  };

  const dismissSlaAlert = (workOrderId: string) => {
    setSlaAlerts((current) =>
      current.filter((alert) => alert.workOrderId !== workOrderId),
    );
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
