-- ============================================
-- Migration 00006: Remove status check constraint from flocks
-- Status/stage logic is handled in application code
-- ============================================

alter table public.flocks drop constraint if exists flocks_status_check;
