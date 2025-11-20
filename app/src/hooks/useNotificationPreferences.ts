import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type {
  UserNotificationPreference,
  UserNotificationPreferenceInsert,
} from "@/types/database";

export interface NotificationPreferencesState {
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  appointmentReminders: boolean;
  overdueAlerts: boolean;
  lowInventoryAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferencesState = {
  notifyEmail: true,
  notifySms: false,
  notifyPush: true,
  appointmentReminders: true,
  overdueAlerts: true,
  lowInventoryAlerts: true,
  dailyReports: false,
  weeklyReports: true,
};

const normalizePreferences = (
  row: UserNotificationPreference | null,
): NotificationPreferencesState => ({
  notifyEmail: row?.notify_email ?? DEFAULT_PREFERENCES.notifyEmail,
  notifySms: row?.notify_sms ?? DEFAULT_PREFERENCES.notifySms,
  notifyPush: row?.notify_push ?? DEFAULT_PREFERENCES.notifyPush,
  appointmentReminders:
    row?.appointment_reminders ?? DEFAULT_PREFERENCES.appointmentReminders,
  overdueAlerts: row?.overdue_alerts ?? DEFAULT_PREFERENCES.overdueAlerts,
  lowInventoryAlerts:
    row?.low_inventory_alerts ?? DEFAULT_PREFERENCES.lowInventoryAlerts,
  dailyReports: row?.daily_reports ?? DEFAULT_PREFERENCES.dailyReports,
  weeklyReports: row?.weekly_reports ?? DEFAULT_PREFERENCES.weeklyReports,
});

export const useNotificationPreferences = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferencesState>(
    DEFAULT_PREFERENCES,
  );
  const [initial, setInitial] = useState<NotificationPreferencesState>(
    DEFAULT_PREFERENCES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileId = profile?.id;
  const orgId = profile?.org_id;

  useEffect(() => {
    if (!profileId || !orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("user_notification_preferences")
          .select("*")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          console.error("Failed to load notification preferences", fetchError);
          setError(fetchError.message);
          setPreferences(DEFAULT_PREFERENCES);
          setInitial(DEFAULT_PREFERENCES);
          return;
        }

        const normalized = normalizePreferences(data);
        setPreferences(normalized);
        setInitial(normalized);
      } catch (err) {
        if (cancelled) return;
        console.error("Notification preferences load error", err);
        setError(err instanceof Error ? err.message : "Unable to load preferences");
        setPreferences(DEFAULT_PREFERENCES);
        setInitial(DEFAULT_PREFERENCES);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [profileId, orgId]);

  const dirty = useMemo(() => {
    return JSON.stringify(preferences) !== JSON.stringify(initial);
  }, [preferences, initial]);

  const savePreferences = useCallback(
    async (next?: Partial<NotificationPreferencesState>) => {
      if (!profileId || !orgId) return;
      const payload: NotificationPreferencesState = {
        ...preferences,
        ...(next ?? {}),
      };

      const insertPayload: UserNotificationPreferenceInsert = {
        org_id: orgId,
        profile_id: profileId,
        notify_email: payload.notifyEmail,
        notify_sms: payload.notifySms,
        notify_push: payload.notifyPush,
        appointment_reminders: payload.appointmentReminders,
        overdue_alerts: payload.overdueAlerts,
        low_inventory_alerts: payload.lowInventoryAlerts,
        daily_reports: payload.dailyReports,
        weekly_reports: payload.weeklyReports,
      };

      try {
        setSaving(true);
        setError(null);

        const { error: upsertError } = await supabase
          .from("user_notification_preferences")
          .upsert(insertPayload, { onConflict: "profile_id" });

        if (upsertError) {
          throw upsertError;
        }

        setPreferences(payload);
        setInitial(payload);
        toast({
          title: "Notification preferences updated",
          description: "We'll use these channels for future alerts.",
        });
      } catch (err) {
        console.error("Failed to save notification preferences", err);
        setError(err instanceof Error ? err.message : "Unable to save preferences");
        toast({
          title: "Unable to save preferences",
          description: "Please try again or contact support if this continues.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [profileId, orgId, preferences, toast],
  );

  const updatePreference = useCallback(
    (key: keyof NotificationPreferencesState, value: boolean) => {
      setPreferences((current) => ({ ...current, [key]: value }));
    },
    [setPreferences],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(initial);
  }, [initial]);

  return {
    preferences,
    setPreferences,
    updatePreference,
    savePreferences,
    resetPreferences,
    loading,
    saving,
    dirty,
    error,
  };
};
