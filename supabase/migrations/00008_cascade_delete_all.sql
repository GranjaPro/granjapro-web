-- ============================================
-- Migration 00008: Change all ON DELETE SET NULL to ON DELETE CASCADE
-- When a profile is deleted, all associated data cascades
-- ============================================

-- 1. profiles.farm_id → farms(id)
alter table public.profiles
  drop constraint if exists profiles_farm_id_fkey;
alter table public.profiles
  add constraint profiles_farm_id_fkey
  foreign key (farm_id) references public.farms(id) on delete cascade;

-- 2. egg_production.barn_id → barns(id)
alter table public.egg_production
  drop constraint if exists egg_production_barn_id_fkey;
alter table public.egg_production
  add constraint egg_production_barn_id_fkey
  foreign key (barn_id) references public.barns(id) on delete cascade;

-- 3. egg_production.flock_id → flocks(id)
alter table public.egg_production
  drop constraint if exists egg_production_flock_id_fkey;
alter table public.egg_production
  add constraint egg_production_flock_id_fkey
  foreign key (flock_id) references public.flocks(id) on delete cascade;

-- 4. feed_consumption.barn_id → barns(id)
alter table public.feed_consumption
  drop constraint if exists feed_consumption_barn_id_fkey;
alter table public.feed_consumption
  add constraint feed_consumption_barn_id_fkey
  foreign key (barn_id) references public.barns(id) on delete cascade;

-- 5. feed_consumption.flock_id → flocks(id)
alter table public.feed_consumption
  drop constraint if exists feed_consumption_flock_id_fkey;
alter table public.feed_consumption
  add constraint feed_consumption_flock_id_fkey
  foreign key (flock_id) references public.flocks(id) on delete cascade;

-- 6. mortality.barn_id → barns(id)
alter table public.mortality
  drop constraint if exists mortality_barn_id_fkey;
alter table public.mortality
  add constraint mortality_barn_id_fkey
  foreign key (barn_id) references public.barns(id) on delete cascade;

-- 7. mortality.flock_id → flocks(id)
alter table public.mortality
  drop constraint if exists mortality_flock_id_fkey;
alter table public.mortality
  add constraint mortality_flock_id_fkey
  foreign key (flock_id) references public.flocks(id) on delete cascade;

-- 8. sales.customer_id → customers(id)
alter table public.sales
  drop constraint if exists sales_customer_id_fkey;
alter table public.sales
  add constraint sales_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete cascade;

-- 9. tasks.assigned_to → profiles(id)
alter table public.tasks
  drop constraint if exists tasks_assigned_to_fkey;
alter table public.tasks
  add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references public.profiles(id) on delete cascade;
