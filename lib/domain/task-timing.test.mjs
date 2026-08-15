import assert from "node:assert/strict";
import test from "node:test";

import { formatTaskCompletionDate, shouldMarkTaskOccurrenceMissed, toLocalDateKey } from "./task-timing.ts";

test("keeps a late-night task pending early on the same day", () => {
  assert.equal(shouldMarkTaskOccurrenceMissed({
    occurrenceDate: "2026-08-06",
    today: "2026-08-06",
    scheduledTime: "23:59:00",
    currentMinutes: 6 * 60 + 10,
  }), false);
});

test("marks a task missed only after its 60-minute grace period", () => {
  assert.equal(shouldMarkTaskOccurrenceMissed({
    occurrenceDate: "2026-08-06",
    today: "2026-08-06",
    scheduledTime: "08:00:00",
    currentMinutes: 9 * 60,
  }), false);
  assert.equal(shouldMarkTaskOccurrenceMissed({
    occurrenceDate: "2026-08-06",
    today: "2026-08-06",
    scheduledTime: "08:00:00",
    currentMinutes: 9 * 60 + 1,
  }), true);
});

test("marks previous occurrences missed and formats dates locally", () => {
  assert.equal(shouldMarkTaskOccurrenceMissed({
    occurrenceDate: "2026-08-05",
    today: "2026-08-06",
    scheduledTime: "23:59:00",
    currentMinutes: 6 * 60 + 10,
  }), true);
  assert.equal(toLocalDateKey(new Date(2026, 7, 6, 23, 30)), "2026-08-06");
});

test("formats task completion with full local date and time", () => {
  assert.equal(formatTaskCompletionDate("2026-08-06T15:30:00"), "06/08/2026 às 15:30");
});
