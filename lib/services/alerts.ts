import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/database.types";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationEmailStatus,
  type NotificationSeverity,
  type NotificationStatus,
} from "@/lib/domain/notification-rules";

type NotificationRow = Tables<"notifications">;
type RecipientRow = Tables<"notification_recipients">;
type PreferenceRow = Tables<"notification_preferences">;
type DeliveryRow = Tables<"notification_email_deliveries">;

export interface NotificationInboxItem {
  recipientId: string;
  notificationId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionPath: string;
  status: NotificationStatus;
  readAt: string | null;
  dismissedAt: string | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt: string | null;
  emailStatus: NotificationEmailStatus | null;
}

export interface NotificationPreference {
  farmId: string;
  userId: string;
  category: NotificationCategory;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export interface NotificationPreferenceInput extends NotificationPreference {}

export interface NotificationSettings {
  farmId: string;
  lowStockThresholdPercent: number;
  upcomingVaccinationDays: number;
  lowLayingWindowDays: number;
  lowLayingGapPercent: number;
  highMortalityWindowDays: number;
  highMortalityPercent: number;
  delinquencyDays: number;
}

function latestDeliveries(deliveries: DeliveryRow[]): Map<string, DeliveryRow> {
  return deliveries.reduce((latest, delivery) => {
    const current = latest.get(delivery.notification_id);
    if (!current || delivery.occurrence_version > current.occurrence_version) latest.set(delivery.notification_id, delivery);
    return latest;
  }, new Map<string, DeliveryRow>());
}

export async function getNotifications(userId: string, farmId: string): Promise<NotificationInboxItem[]> {
  const supabase = createClient();
  const { data: recipients, error: recipientError } = await supabase.from("notification_recipients").select("*")
    .eq("user_id", userId).eq("farm_id", farmId).order("created_at", { ascending: false });
  if (recipientError) throw recipientError;
  if (!recipients?.length) return [];

  const notificationIds = [...new Set(recipients.map((recipient) => recipient.notification_id))];
  const [notificationResult, deliveryResult] = await Promise.all([
    supabase.from("notifications").select("*").in("id", notificationIds),
    supabase.from("notification_email_deliveries").select("*").eq("user_id", userId).eq("farm_id", farmId)
      .in("notification_id", notificationIds),
  ]);
  if (notificationResult.error) throw notificationResult.error;
  if (deliveryResult.error) throw deliveryResult.error;

  const byId = new Map((notificationResult.data ?? []).map((notification) => [notification.id, notification as NotificationRow]));
  const deliveryByNotification = latestDeliveries((deliveryResult.data ?? []) as DeliveryRow[]);
  return (recipients as RecipientRow[]).flatMap((recipient) => {
    const notification = byId.get(recipient.notification_id);
    if (!notification || notification.occurrence_version !== recipient.occurrence_version) return [];
    return [{
      recipientId: recipient.id,
      notificationId: notification.id,
      category: notification.category,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      actionPath: notification.action_path,
      status: notification.status,
      readAt: recipient.read_at,
      dismissedAt: recipient.dismissed_at,
      firstDetectedAt: notification.first_detected_at,
      lastDetectedAt: notification.last_detected_at,
      resolvedAt: notification.resolved_at,
      emailStatus: deliveryByNotification.get(notification.id)?.status ?? null,
    }];
  });
}

export async function getUnreadNotificationCount(userId: string, farmId: string): Promise<number> {
  const notifications = await getNotifications(userId, farmId);
  return notifications.filter((item) => item.status === "active" && !item.readAt && !item.dismissedAt).length;
}

async function updateRecipient(id: string, values: Pick<Tables<"notification_recipients">, "read_at" | "dismissed_at">): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notification_recipients").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markNotificationAsRead(recipientId: string): Promise<void> {
  await updateRecipient(recipientId, { read_at: new Date().toISOString(), dismissed_at: null });
}

export async function dismissNotification(recipientId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateRecipient(recipientId, { read_at: now, dismissed_at: now });
}

export async function markAllNotificationsAsRead(farmId: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("notification_recipients").update({ read_at: now, updated_at: now })
    .eq("farm_id", farmId).is("read_at", null);
  if (error) throw error;
}

export async function getNotificationPreferences(userId: string, farmId: string): Promise<NotificationPreference[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).eq("farm_id", farmId);
  if (error) throw error;
  const byCategory = new Map((data ?? []).map((row) => [row.category, row as PreferenceRow]));
  return NOTIFICATION_CATEGORIES.map((category) => ({
    farmId,
    userId,
    category,
    inAppEnabled: byCategory.get(category)?.in_app_enabled ?? true,
    emailEnabled: byCategory.get(category)?.email_enabled ?? true,
  }));
}

export async function saveNotificationPreferences(preferences: NotificationPreferenceInput[]): Promise<void> {
  if (!preferences.length) return;
  const supabase = createClient();
  const now = new Date().toISOString();
  const rows: TablesInsert<"notification_preferences">[] = preferences.map((preference) => ({
    farm_id: preference.farmId,
    user_id: preference.userId,
    category: preference.category,
    in_app_enabled: preference.inAppEnabled,
    email_enabled: preference.emailEnabled,
    updated_at: now,
  }));
  const { error } = await supabase.from("notification_preferences").upsert(rows, { onConflict: "farm_id,user_id,category" });
  if (error) throw error;
}

export async function getNotificationSettings(farmId: string): Promise<NotificationSettings> {
  const supabase = createClient();
  const { data, error } = await supabase.from("notification_settings").select("*").eq("farm_id", farmId).maybeSingle();
  if (error) throw error;
  return {
    farmId,
    lowStockThresholdPercent: Number(data?.low_stock_threshold_percent ?? DEFAULT_NOTIFICATION_SETTINGS.lowStockThresholdPercent),
    upcomingVaccinationDays: data?.upcoming_vaccination_days ?? DEFAULT_NOTIFICATION_SETTINGS.upcomingVaccinationDays,
    lowLayingWindowDays: data?.low_laying_window_days ?? DEFAULT_NOTIFICATION_SETTINGS.lowLayingWindowDays,
    lowLayingGapPercent: Number(data?.low_laying_gap_percent ?? DEFAULT_NOTIFICATION_SETTINGS.lowLayingGapPercent),
    highMortalityWindowDays: data?.high_mortality_window_days ?? DEFAULT_NOTIFICATION_SETTINGS.highMortalityWindowDays,
    highMortalityPercent: Number(data?.high_mortality_percent ?? DEFAULT_NOTIFICATION_SETTINGS.highMortalityPercent),
    delinquencyDays: data?.delinquency_days ?? DEFAULT_NOTIFICATION_SETTINGS.delinquencyDays,
  };
}

export async function saveLowStockThreshold(farmId: string, thresholdPercent: number): Promise<void> {
  if (!Number.isFinite(thresholdPercent) || thresholdPercent < 0 || thresholdPercent > 100) {
    throw new Error("Informe um percentual entre 0 e 100.");
  }
  const supabase = createClient();
  const { error } = await supabase.from("notification_settings").upsert({
    farm_id: farmId,
    low_stock_threshold_percent: thresholdPercent,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
