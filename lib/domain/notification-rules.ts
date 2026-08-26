export const NOTIFICATION_CATEGORIES = [
  "low_inventory",
  "vaccination",
  "low_laying_rate",
  "high_mortality",
  "delinquent_customer",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationStatus = "active" | "resolved";
export type NotificationEmailStatus = "pending" | "processing" | "retry" | "sent" | "failed";

export const DEFAULT_NOTIFICATION_SETTINGS = {
  lowStockThresholdPercent: 25,
  upcomingVaccinationDays: 7,
  lowLayingWindowDays: 7,
  lowLayingGapPercent: 5,
  highMortalityWindowDays: 7,
  highMortalityPercent: 0.5,
  delinquencyDays: 30,
} as const;

export function buildNotificationDedupKey(
  category: NotificationCategory,
  entityType: string,
  entityId: string,
): string {
  const normalizedEntityType = entityType.trim();
  const normalizedEntityId = entityId.trim();
  if (!normalizedEntityType || !normalizedEntityId) {
    throw new Error("Notification deduplication requires an entity type and identifier.");
  }
  return `${category}:${normalizedEntityType}:${normalizedEntityId}`;
}

export function buildNotificationEmailIdempotencyKey(
  notificationId: string,
  occurrenceVersion: number,
  userId: string,
): string {
  if (!notificationId.trim() || !userId.trim() || !Number.isInteger(occurrenceVersion) || occurrenceVersion < 1) {
    throw new Error("Invalid notification email idempotency input.");
  }
  return `notification/${notificationId}/${occurrenceVersion}/${userId}`;
}

export interface NotificationRetryDecision {
  retryable: boolean;
  delaySeconds: number | null;
}

export function classifyNotificationEmailFailure(
  httpStatus: number | null,
  errorCode: string | null,
  retryAfterSeconds: number | null,
): NotificationRetryDecision {
  if (httpStatus === null || httpStatus >= 500) {
    return { retryable: true, delaySeconds: retryAfterSeconds };
  }

  if (httpStatus === 409 && errorCode === "concurrent_idempotent_requests") {
    return { retryable: true, delaySeconds: retryAfterSeconds };
  }

  if (httpStatus === 429) {
    const quotaDelay = errorCode === "daily_quota_exceeded" || errorCode === "monthly_quota_exceeded"
      ? 24 * 60 * 60
      : null;
    return { retryable: true, delaySeconds: retryAfterSeconds ?? quotaDelay };
  }

  return { retryable: false, delaySeconds: null };
}

export function getNotificationRetryDelaySeconds(attemptCount: number): number {
  const delaysInSeconds = [60, 5 * 60, 15 * 60, 60 * 60, 6 * 60 * 60];
  const index = Math.min(Math.max(Math.trunc(attemptCount) - 1, 0), delaysInSeconds.length - 1);
  return delaysInSeconds[index];
}
