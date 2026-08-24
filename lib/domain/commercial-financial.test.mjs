import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCommercialFinancialMetrics,
  calculateCustomerCommercialMetrics,
  getSalePaymentState,
} from "./commercial-financial.ts";

const sale = (overrides = {}) => ({
  customerId: "customer-1",
  date: "2026-08-10",
  dueDate: "2026-08-20",
  paidAt: null,
  paymentStatus: "pending",
  total: 100,
  ...overrides,
});

test("derives pending, overdue, delinquent and paid states", () => {
  assert.equal(getSalePaymentState(sale(), "2026-08-20"), "pending");
  assert.equal(getSalePaymentState(sale(), "2026-08-21"), "overdue");
  assert.equal(getSalePaymentState(sale(), "2026-09-19"), "delinquent");
  assert.equal(getSalePaymentState(sale({ paymentStatus: "paid", paidAt: "2026-08-15" }), "2026-09-19"), "paid");
});

test("separates billed, received and open receivables", () => {
  const metrics = calculateCommercialFinancialMetrics([
    sale({ total: 100, dueDate: "2026-08-30" }),
    sale({ total: 200, dueDate: "2026-08-10" }),
    sale({ total: 300, dueDate: "2026-07-01" }),
    sale({ total: 400, paymentStatus: "paid", paidAt: "2026-08-12" }),
  ], "2026-08-01", "2026-08-31", "2026-08-23");
  assert.deepEqual(metrics, {
    billed: 1000,
    received: 400,
    receivable: 100,
    overdue: 200,
    delinquent: 300,
  });
});

test("uses the most severe open sale as customer status", () => {
  const metrics = calculateCustomerCommercialMetrics([
    sale({ total: 100, dueDate: "2026-08-30" }),
    sale({ total: 200, date: "2026-07-01", dueDate: "2026-08-01" }),
  ], "2026-08-01", "2026-08-31", "2026-08-23");
  assert.equal(metrics.status, "overdue");
  assert.equal(metrics.lastSaleDate, "2026-08-10");
  assert.equal(metrics.totalSales, 2);
  assert.equal(metrics.averageTicket, 150);
});
