-- ============================================
-- Migration 00023: Dunning grace period
-- Tracks the deadline a customer has to fix a failed renewal payment
-- before access is blocked. Set when a renewal invoice fails, cleared
-- when payment succeeds.
-- ============================================

alter table public.billing_subscriptions
  add column if not exists grace_period_ends_at timestamptz;
