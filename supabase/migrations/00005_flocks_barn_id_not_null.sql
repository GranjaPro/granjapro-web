-- ============================================
-- Migration 00005: Make flocks.barn_id NOT NULL
-- Every flock must be linked to a barn
-- ============================================

-- First, delete any orphaned flocks that have no barn
delete from public.flocks where barn_id is null;

-- Make barn_id NOT NULL
alter table public.flocks
  alter column barn_id set not null;
