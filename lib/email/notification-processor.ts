import type { Tables } from "@/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  classifyNotificationEmailFailure,
  getNotificationRetryDelaySeconds,
} from "@/lib/domain/notification-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationEmail } from "./templates";
import { sendEmailWithResult } from "./send";

type DeliveryRow = Tables<"notification_email_deliveries">;
type NotificationRow = Tables<"notifications">;

interface RpcResult<T> {
  data: T;
  error: PostgrestError | null;
}

interface NotificationRpcClient {
  rpc(
    fn: "claim_notification_email_deliveries",
    args: { p_limit: number },
  ): PromiseLike<RpcResult<DeliveryRow[] | null>>;
  rpc(
    fn: "complete_notification_email_delivery",
    args: { p_delivery_id: string; p_provider_id: string },
  ): PromiseLike<RpcResult<null>>;
  rpc(
    fn: "fail_notification_email_delivery",
    args: {
      p_delivery_id: string;
      p_terminal: boolean;
      p_next_attempt_at: string;
      p_http_status: number | null;
      p_error_code: string | null;
      p_error_detail: string | null;
    },
  ): PromiseLike<RpcResult<null>>;
}

function createNotificationRpcClient(): NotificationRpcClient {
  return createAdminClient() as unknown as NotificationRpcClient;
}

export interface NotificationEmailProcessingResult {
  claimed: number;
  sent: number;
  retrying: number;
  failed: number;
}

function resolveActionUrl(appUrl: string, actionPath: string): string {
  const baseUrl = new URL(appUrl);
  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("Notification app URL must use HTTP or HTTPS.");
  }
  return new URL(actionPath, baseUrl).toString();
}

async function failDelivery(
  delivery: DeliveryRow,
  terminal: boolean,
  nextAttemptAt: string,
  httpStatus: number | null,
  errorCode: string,
  errorDetail: string,
): Promise<void> {
  const rpcClient = createNotificationRpcClient();
  const { error } = await rpcClient.rpc("fail_notification_email_delivery", {
    p_delivery_id: delivery.id,
    p_terminal: terminal,
    p_next_attempt_at: nextAttemptAt,
    p_http_status: httpStatus,
    p_error_code: errorCode,
    p_error_detail: errorDetail,
  });
  if (error) throw error;
}

export async function processNotificationEmailDeliveries(
  appUrl: string,
  limit = 4,
): Promise<NotificationEmailProcessingResult> {
  const admin = createAdminClient();
  const rpcClient = createNotificationRpcClient();
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 4));
  const { data: claimed, error: claimError } = await rpcClient.rpc(
    "claim_notification_email_deliveries",
    { p_limit: safeLimit },
  );
  if (claimError) throw claimError;

  const deliveries = (claimed ?? []) as DeliveryRow[];
  const result: NotificationEmailProcessingResult = {
    claimed: deliveries.length,
    sent: 0,
    retrying: 0,
    failed: 0,
  };
  if (!deliveries.length) return result;

  const notificationIds = [...new Set(deliveries.map((delivery) => delivery.notification_id))];
  const { data: notifications, error: notificationError } = await admin
    .from("notifications")
    .select("*")
    .in("id", notificationIds);
  if (notificationError) throw notificationError;

  const notificationRows = (notifications ?? []) as unknown as NotificationRow[];
  const notificationsById = new Map(
    notificationRows.map((notification) => [notification.id, notification]),
  );

  for (const delivery of deliveries) {
    const notification = notificationsById.get(delivery.notification_id);
    if (!notification || notification.occurrence_version !== delivery.occurrence_version) {
      await failDelivery(
        delivery,
        true,
        new Date().toISOString(),
        null,
        "stale_notification_occurrence",
        "The notification occurrence no longer exists.",
      );
      result.failed += 1;
      continue;
    }

    if (notification.status !== "active") {
      await failDelivery(
        delivery,
        true,
        new Date().toISOString(),
        null,
        "notification_resolved",
        "The notification condition was resolved before email delivery.",
      );
      result.failed += 1;
      continue;
    }

    let actionUrl: string;
    try {
      actionUrl = resolveActionUrl(appUrl, notification.action_path);
    } catch (urlError: unknown) {
      await failDelivery(
        delivery,
        true,
        new Date().toISOString(),
        null,
        "invalid_action_url",
        urlError instanceof Error ? urlError.message : "Invalid notification action URL.",
      );
      result.failed += 1;
      continue;
    }

    const email = notificationEmail({
      category: notification.category,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      actionUrl,
    });
    const sendResult = await sendEmailWithResult({
      to: delivery.recipient_email,
      subject: email.subject,
      html: email.html,
      idempotencyKey: delivery.idempotency_key,
    });

    if (sendResult.ok && sendResult.providerId) {
      const { error } = await rpcClient.rpc("complete_notification_email_delivery", {
        p_delivery_id: delivery.id,
        p_provider_id: sendResult.providerId,
      });
      if (error) throw error;
      result.sent += 1;
      continue;
    }

    const retryDecision = classifyNotificationEmailFailure(
      sendResult.httpStatus,
      sendResult.errorCode,
      sendResult.retryAfterSeconds,
    );
    const delaySeconds = retryDecision.delaySeconds
      ?? getNotificationRetryDelaySeconds(delivery.attempt_count);
    const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    await failDelivery(
      delivery,
      !retryDecision.retryable,
      nextAttemptAt,
      sendResult.httpStatus,
      sendResult.errorCode ?? "unknown_email_error",
      sendResult.errorDetail ?? "The email provider did not return an error detail.",
    );
    if (retryDecision.retryable && delivery.attempt_count < 6) result.retrying += 1;
    else result.failed += 1;
  }

  return result;
}
