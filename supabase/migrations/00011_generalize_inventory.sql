-- ============================================
-- Migration 00012: Generalize Inventory Table
-- Renames feed_inventory to inventory and adds general columns
-- ============================================

-- Rename the table
alter table if exists public.feed_inventory rename to inventory;

-- Rename category to type
alter table public.inventory rename column category to type;

-- Remove old constraints
alter table public.inventory drop constraint if exists feed_inventory_category_check;
alter table public.inventory drop constraint if exists feed_inventory_unit_check;
alter table public.inventory drop constraint if exists feed_inventory_status_check;

-- Add new columns
alter table public.inventory 
  add column if not exists area text,
  add column if not exists capacity text,
  add column if not exists current_occupation numeric(5,2) default 0,
  add column if not exists inventory_value numeric(12,2) default 0,
  add column if not exists expiration_date date,
  add column if not exists daily_consumption numeric(10,2) default 0,
  add column if not exists notes text;

-- Update type and status defaults/types if needed (making them more flexible)
alter table public.inventory alter column type drop default;
alter table public.inventory alter column type set default 'outros';
alter table public.inventory alter column status set default 'ativo';

-- Update RLS Policy names (optional but good for consistency)
-- Supabase automatically renames the table in policies when using 'alter table rename'
-- but the policy names themselves stay the same. We can leave them or recreate them.
-- To keep it simple and safe, we'll just ensure the policies exist on the new name.

-- Rename the trigger if it still has the old table name context (optional)
-- The trigger itself was 'set_updated_at' on 'feed_inventory'. 
-- In Section 10 it was created as:
-- create trigger set_updated_at before update on public.feed_inventory ...
-- Postgres automatically moves the trigger to the renamed table.
