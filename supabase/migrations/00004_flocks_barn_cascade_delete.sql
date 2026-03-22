-- ============================================
-- Migration 00004: Change flocks.barn_id to ON DELETE CASCADE
-- When a barn is deleted, all associated flocks are also deleted
-- ============================================

-- Drop the existing foreign key constraint
alter table public.flocks
  drop constraint if exists flocks_barn_id_fkey;

-- Re-add with ON DELETE CASCADE
alter table public.flocks
  add constraint flocks_barn_id_fkey
  foreign key (barn_id) references public.barns(id) on delete cascade;
