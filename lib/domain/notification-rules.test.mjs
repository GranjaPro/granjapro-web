import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  buildNotificationDedupKey,
  buildNotificationEmailIdempotencyKey,
  classifyNotificationEmailFailure,
  getNotificationRetryDelaySeconds,
} from "./notification-rules.ts";

test("keeps the approved notification thresholds in one contract", () => {
  assert.deepEqual(DEFAULT_NOTIFICATION_SETTINGS, {
    lowStockThresholdPercent: 25,
    upcomingVaccinationDays: 7,
    lowLayingWindowDays: 7,
    lowLayingGapPercent: 5,
    highMortalityWindowDays: 7,
    highMortalityPercent: 0.5,
    delinquencyDays: 30,
  });
});

test("builds stable condition and email idempotency keys", () => {
  assert.equal(buildNotificationDedupKey("vaccination", "health_record", "record-1"), "vaccination:health_record:record-1");
  assert.equal(buildNotificationEmailIdempotencyKey("notification-1", 2, "user-1"), "notification/notification-1/2/user-1");
});

test("rejects incomplete idempotency inputs", () => {
  assert.throws(() => buildNotificationDedupKey("low_inventory", "inventory", " "));
  assert.throws(() => buildNotificationEmailIdempotencyKey("notification-1", 0, "user-1"));
});

test("retries network, concurrency, quota and server failures", () => {
  assert.deepEqual(classifyNotificationEmailFailure(null, "network_error", null), { retryable: true, delaySeconds: null });
  assert.deepEqual(classifyNotificationEmailFailure(409, "concurrent_idempotent_requests", 10), { retryable: true, delaySeconds: 10 });
  assert.deepEqual(classifyNotificationEmailFailure(429, "daily_quota_exceeded", null), { retryable: true, delaySeconds: 86_400 });
  assert.deepEqual(classifyNotificationEmailFailure(503, "application_error", null), { retryable: true, delaySeconds: null });
});

test("treats invalid requests and credentials as terminal", () => {
  assert.deepEqual(classifyNotificationEmailFailure(400, "validation_error", null), { retryable: false, delaySeconds: null });
  assert.deepEqual(classifyNotificationEmailFailure(403, "invalid_api_key", null), { retryable: false, delaySeconds: null });
  assert.deepEqual(classifyNotificationEmailFailure(422, "invalid_from_address", null), { retryable: false, delaySeconds: null });
});

test("uses the approved capped retry schedule", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(getNotificationRetryDelaySeconds), [60, 300, 900, 3600, 21_600, 21_600]);
});
