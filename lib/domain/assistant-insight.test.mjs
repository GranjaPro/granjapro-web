import assert from "node:assert/strict";
import test from "node:test";

import { prepareAssistantInsights } from "./assistant-insight.ts";

function insight(id, level, priority = 0) {
  return { id, level, priority, title: id, action: id, href: "/dashboard", hrefLabel: "Ver painel" };
}

test("orders insights by severity, priority and stable id", () => {
  const result = prepareAssistantInsights([
    insight("info", "info"),
    insight("success", "success"),
    insight("warning-b", "warning", 2),
    insight("critical", "critical"),
    insight("warning-a", "warning", 2),
    insight("warning-first", "warning", 1),
  ], 10);

  assert.deepEqual(result.map((item) => item.id), [
    "critical",
    "warning-first",
    "warning-a",
    "warning-b",
    "success",
    "info",
  ]);
});

test("deduplicates by stable id and applies limits", () => {
  const result = prepareAssistantInsights([
    insight("duplicate", "warning", 2),
    insight("duplicate", "critical", 1),
    insight("second", "info"),
  ], 1);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "duplicate");
  assert.equal(result[0].level, "critical");
  assert.deepEqual(prepareAssistantInsights([insight("only", "info")], 0), []);
});

test("limits the default result to five insights", () => {
  const result = prepareAssistantInsights(Array.from({ length: 7 }, (_, index) => insight(`item-${index}`, "info")));
  assert.equal(result.length, 5);
});
