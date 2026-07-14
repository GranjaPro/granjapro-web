-- ============================================
-- Granja Pro – Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (linked to auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  email text not null,
  full_name text not null,
  farm_id uuid,
  role text default 'owner' check (role in ('owner', 'manager', 'worker')),
  avatar_url text,
  plan text check (plan in ('essencial', 'pro', 'premium')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_used_at timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger 
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_used_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'premium',
    now(),
    now() + interval '7 days',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to auto-sync barns.current_birds when flocks change
CREATE OR REPLACE FUNCTION public.sync_barn_birds()
RETURNS trigger
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.barn_id IS NOT NULL THEN
      UPDATE barns
      SET current_birds = GREATEST((
        SELECT COALESCE(SUM(bird_count), 0) FROM flocks WHERE barn_id = OLD.barn_id AND id != OLD.id
      ), 0),
      updated_at = now()
      WHERE id = OLD.barn_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.barn_id IS NOT NULL THEN
      UPDATE barns
      SET current_birds = (
        SELECT COALESCE(SUM(bird_count), 0) FROM flocks WHERE barn_id = NEW.barn_id
      ),
      updated_at = now()
      WHERE id = NEW.barn_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_barn_birds ON flocks;
CREATE TRIGGER trg_sync_barn_birds
AFTER INSERT OR UPDATE OR DELETE ON flocks
FOR EACH ROW EXECUTE FUNCTION sync_barn_birds();

-- ============================================
-- 2. FARMS
-- ============================================
create table public.farms (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  producer_name text not null,
  production_system text default 'Convencional',
  total_birds int default 0,
  main_breed text default '',
  sells_eggs_directly boolean default true,
  financial_tracking boolean default true,
  owner_id uuid references auth.users on delete cascade not null
);

alter table public.farms enable row level security;

-- Users can only see farms they own or belong to
create policy "Users can view own farms"
  on public.farms for select
  using (
    owner_id = auth.uid()
    or id in (select farm_id from public.profiles where id = auth.uid())
  );

create policy "Owners can insert farms"
  on public.farms for insert
  with check (owner_id = auth.uid());

create policy "Owners can update own farms"
  on public.farms for update
  using (owner_id = auth.uid());

create policy "Owners can delete own farms"
  on public.farms for delete
  using (owner_id = auth.uid());

-- Add foreign key from profiles to farms (after farms table exists)
alter table public.profiles
  add constraint profiles_farm_id_fkey
  foreign key (farm_id) references public.farms(id) on delete cascade;

-- ============================================
-- 3. BARNS
-- ============================================
create table public.barns (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  capacity int default 0,
  current_birds int default 0,
  production_system text default 'Convencional',
  status text default 'active' check (status in ('active', 'maintenance', 'inactive'))
);

alter table public.barns enable row level security;

create policy "Users can view barns of their farm"
  on public.barns for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert barns in their farm"
  on public.barns for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update barns in their farm"
  on public.barns for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete barns in their farm"
  on public.barns for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 4. FLOCKS
-- ============================================
create table public.flocks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete cascade not null,
  code text not null,
  breed text not null,
  lineage text,
  bird_count int not null,
  arrival_age_weeks int default 0,
  arrival_date date not null,
  avg_weight_kg numeric(5,2),
  supplier text,
  supplier_contact text,
  origin text,
  production_system text default 'Convencional',
  status text default 'active'
);

alter table public.flocks enable row level security;

create policy "Users can view flocks of their farm"
  on public.flocks for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert flocks in their farm"
  on public.flocks for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update flocks in their farm"
  on public.flocks for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete flocks in their farm"
  on public.flocks for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 5. EGG PRODUCTION
-- ============================================
create table public.egg_production (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete cascade,
  flock_id uuid references public.flocks on delete cascade,
  date date not null,
  eggs_produced int not null,
  broken_eggs int default 0,
  dirty_eggs int default 0,
  discarded_eggs int default 0,
  eggs_sold int default 0,
  egg_price numeric(10,2) default 0,
  laying_rate numeric(5,2) default 0,
  eggs_per_bird numeric(5,2) default 0
);

alter table public.egg_production enable row level security;

create policy "Users can view egg production of their farm"
  on public.egg_production for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert egg production in their farm"
  on public.egg_production for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update egg production in their farm"
  on public.egg_production for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete egg production in their farm"
  on public.egg_production for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 6. FEED CONSUMPTION
-- ============================================
create table public.feed_consumption (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete cascade,
  flock_id uuid references public.flocks on delete cascade,
  date date not null,
  quantity_kg numeric(10,2) not null,
  cost numeric(10,2) default 0,
  feed_type text default 'Ração Postura',
  cost_per_egg numeric(10,4) default 0
);

alter table public.feed_consumption enable row level security;

create policy "Users can view feed consumption of their farm"
  on public.feed_consumption for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert feed consumption in their farm"
  on public.feed_consumption for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update feed consumption in their farm"
  on public.feed_consumption for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete feed consumption in their farm"
  on public.feed_consumption for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 6b. WATER CONSUMPTION
-- ============================================
create table public.water_consumption (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
  date date not null,
  quantity_liters numeric(10,2) not null
);

alter table public.water_consumption enable row level security;

create policy "Users can view water consumption of their farm"
  on public.water_consumption for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert water consumption in their farm"
  on public.water_consumption for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update water consumption in their farm"
  on public.water_consumption for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete water consumption in their farm"
  on public.water_consumption for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 7. MORTALITY
-- ============================================
create table public.mortality (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete cascade,
  flock_id uuid references public.flocks on delete cascade,
  date date not null,
  dead_birds int not null,
  cause text default 'Natural',
  mortality_rate numeric(5,2) default 0,
  notes text
);

alter table public.mortality enable row level security;

create policy "Users can view mortality of their farm"
  on public.mortality for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert mortality in their farm"
  on public.mortality for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update mortality in their farm"
  on public.mortality for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete mortality in their farm"
  on public.mortality for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 7b. HEALTH RECORDS
-- ============================================
create table public.health_records (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  flock_id uuid references public.flocks on delete cascade,
  title text not null,
  date date not null,
  type text not null check (type in ('vaccination', 'treatment', 'inspection')),
  status text not null default 'completed' check (status in ('completed', 'in_progress', 'scheduled', 'upcoming')),
  responsible text,
  notes text
);

alter table public.health_records enable row level security;

create index idx_health_records_farm_date on public.health_records (farm_id, date);

create policy "Users can view health records of their farm"
  on public.health_records for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert health records in their farm"
  on public.health_records for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update health records in their farm"
  on public.health_records for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete health records in their farm"
  on public.health_records for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 8. FINANCIAL TRANSACTIONS
-- ============================================
create table public.financial_transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  date date not null,
  type text not null check (type in ('revenue', 'expense')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null,
  payment_method text,
  reference text
);

alter table public.financial_transactions enable row level security;

create policy "Users can view transactions of their farm"
  on public.financial_transactions for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert transactions in their farm"
  on public.financial_transactions for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update transactions in their farm"
  on public.financial_transactions for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete transactions in their farm"
  on public.financial_transactions for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 9. CUSTOMERS
-- ============================================
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  type text default 'direct' check (type in ('market', 'restaurant', 'distributor', 'direct')),
  phone text,
  email text,
  location text,
  payment_terms text,
  notes text
);

alter table public.customers enable row level security;

create policy "Users can view customers of their farm"
  on public.customers for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert customers in their farm"
  on public.customers for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update customers in their farm"
  on public.customers for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete customers in their farm"
  on public.customers for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 10. SALES
-- ============================================
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  customer_id uuid references public.customers on delete cascade,
  date date not null,
  quantity int not null,
  egg_type text default 'Branco',
  unit_price numeric(10,2) not null,
  total numeric(12,2) not null,
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'overdue')),
  notes text
);

alter table public.sales enable row level security;

create policy "Users can view sales of their farm"
  on public.sales for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert sales in their farm"
  on public.sales for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update sales in their farm"
  on public.sales for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete sales in their farm"
  on public.sales for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 11. TASKS
-- ============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  flock_id uuid references public.flocks on delete cascade,
  title text not null,
  done boolean default false,
  scheduled_time time,
  date date not null,
  assigned_to uuid references public.profiles on delete cascade,
  category text not null default 'geral' check (category in ('coleta', 'alimentacao', 'limpeza', 'inspecao', 'saude', 'geral')),
  priority text not null default 'media' check (priority in ('alta', 'media', 'baixa')),
  recurrence text not null default 'unica' check (recurrence in ('diaria', 'semanal', 'mensal', 'unica')),
  notes text
);

alter table public.tasks enable row level security;

create policy "Users can view tasks of their farm"
  on public.tasks for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert tasks in their farm"
  on public.tasks for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update tasks in their farm"
  on public.tasks for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can delete tasks in their farm"
  on public.tasks for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create table public.task_exceptions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  task_id uuid references public.tasks on delete cascade not null,
  occurrence_date date not null,
  status text not null check (status in ('done', 'missed', 'skipped')),
  completed_at timestamptz,
  notes text,
  unique (task_id, occurrence_date)
);

alter table public.task_exceptions enable row level security;

create policy "Users can view task exceptions from owned farms"
  on public.task_exceptions for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert task exceptions from owned farms"
  on public.task_exceptions for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update task exceptions from owned farms"
  on public.task_exceptions for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ))
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete task exceptions from owned farms"
  on public.task_exceptions for delete
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- ============================================
-- 12. ALERTS
-- ============================================
create table public.alerts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  type text default 'info' check (type in ('info', 'warning', 'error')),
  message text not null,
  read boolean default false,
  resolved boolean default false
);

alter table public.alerts enable row level security;

create policy "Users can view alerts of their farm"
  on public.alerts for select
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert alerts in their farm"
  on public.alerts for insert
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update alerts in their farm"
  on public.alerts for update
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
    union
    select farm_id from public.profiles where id = auth.uid()
  ));

-- ============================================
-- 13. INDEXES for performance
-- ============================================
create index idx_barns_farm_id on public.barns(farm_id);
create index idx_flocks_farm_id on public.flocks(farm_id);
create index idx_flocks_barn_id on public.flocks(barn_id);
create index idx_egg_production_farm_date on public.egg_production(farm_id, date);
create index idx_feed_consumption_farm_date on public.feed_consumption(farm_id, date);
create index idx_water_consumption_farm_date on public.water_consumption(farm_id, date);
create index idx_water_consumption_flock_id on public.water_consumption(flock_id);
create index idx_mortality_farm_date on public.mortality(farm_id, date);
create index idx_financial_farm_date on public.financial_transactions(farm_id, date);
create index idx_customers_farm_id on public.customers(farm_id);
create index idx_sales_farm_date on public.sales(farm_id, date);
create index idx_tasks_farm_date on public.tasks(farm_id, date);
create index idx_tasks_farm_flock_date on public.tasks(farm_id, flock_id, date);
create index idx_task_exceptions_farm_date on public.task_exceptions(farm_id, occurrence_date);
create index idx_alerts_farm_id on public.alerts(farm_id);
create index idx_profiles_farm_id on public.profiles(farm_id);

-- ============================================
-- 14. UPDATED_AT trigger
-- ============================================
create or replace function public.handle_updated_at()
returns trigger 
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.farms
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.barns
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.flocks
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.task_exceptions
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- 15. FEED INVENTORY
-- ============================================
create table public.inventory (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  type text default 'outros',
  quantity numeric(10,2) not null default 0,
  unit text not null,
  status text default 'ativo',
  location text,
  area text,
  capacity text,
  current_occupation numeric(5,2) default 0,
  inventory_value numeric(12,2) default 0,
  expiration_date date,
  daily_consumption numeric(10,2) default 0,
  notes text
);

alter table public.inventory enable row level security;

create policy "Users can view inventory of their farm" on public.inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));

create policy "Users can insert inventory in their farm" on public.inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can update inventory in their farm" on public.inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can delete inventory in their farm" on public.inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create trigger set_updated_at before update on public.inventory for each row execute procedure public.handle_updated_at();

-- ============================================
-- Migration 00023: Storage Locations and Specialized Inventory
-- ============================================

create table if not exists public.storage_locations (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  category text not null check (category in ('feed', 'vaccine', 'packaging')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_default boolean not null default false,
  notes text,
  unique (farm_id, category, name)
);

create or replace function public.ensure_default_storage_locations(target_farm_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.storage_locations
     set is_default = false,
         updated_at = now()
   where farm_id = target_farm_id
     and category in ('feed', 'vaccine')
     and name in ('Sem local definido - Racao', 'Sem local definido - Vacinas');

  insert into public.storage_locations (farm_id, name, category, is_default)
  values
    (target_farm_id, 'Sem local definido', 'feed', true),
    (target_farm_id, 'Sem local definido', 'vaccine', true),
    (target_farm_id, 'Sem local definido - Embalagens', 'packaging', true)
  on conflict (farm_id, category, name) do update
    set is_default = true,
        status = 'active',
        updated_at = now();
end;
$$;

create or replace function public.ensure_default_storage_locations_for_new_farm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_storage_locations(new.id);
  return new;
end;
$$;

select public.ensure_default_storage_locations(id) from public.farms;

drop trigger if exists ensure_default_storage_locations_after_farm_insert on public.farms;
create trigger ensure_default_storage_locations_after_farm_insert
  after insert on public.farms
  for each row execute procedure public.ensure_default_storage_locations_for_new_farm();

create table if not exists public.feed_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  feed_category text,
  feed_type text,
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'kg',
  status text not null default 'normal' check (status in ('normal', 'alerta', 'baixo')),
  supplier text,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  entry_date date not null default current_date,
  lot_number text,
  minimum_quantity numeric(10,2) not null default 0,
  expiration_date date,
  notes text
);

create table if not exists public.vaccine_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  target_disease text,
  manufacturer text,
  doses integer check (doses is null or doses >= 0),
  application_route text check (application_route is null or application_route in ('oral', 'ocular', 'nasal', 'injectable', 'spray', 'water', 'other')),
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'doses',
  status text not null default 'normal' check (status in ('normal', 'alerta', 'baixo')),
  supplier text,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  entry_date date not null default current_date,
  lot_number text,
  minimum_quantity numeric(10,2) not null default 0,
  expiration_date date not null,
  notes text
);

create table if not exists public.packaging_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  package_type text,
  size text,
  material text,
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'un',
  status text not null default 'normal' check (status in ('normal', 'alerta', 'baixo')),
  supplier text,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  entry_date date not null default current_date,
  lot_number text,
  minimum_quantity numeric(10,2) not null default 0,
  expiration_date date,
  notes text
);

create or replace function public.validate_inventory_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_category text := tg_argv[0];
  location_record public.storage_locations%rowtype;
begin
  select *
    into location_record
    from public.storage_locations
   where id = new.location_id;

  if not found then
    raise exception 'Storage location % does not exist', new.location_id;
  end if;

  if location_record.farm_id <> new.farm_id then
    raise exception 'Storage location farm mismatch';
  end if;

  if location_record.status <> 'active' then
    raise exception 'Storage location is inactive';
  end if;

  if location_record.category <> expected_category then
    raise exception 'Storage location category % does not match %', location_record.category, expected_category;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_feed_inventory_location on public.feed_inventory;
create trigger validate_feed_inventory_location
  before insert or update of farm_id, location_id on public.feed_inventory
  for each row execute procedure public.validate_inventory_storage_location('feed');

drop trigger if exists validate_vaccine_inventory_location on public.vaccine_inventory;
create trigger validate_vaccine_inventory_location
  before insert or update of farm_id, location_id on public.vaccine_inventory
  for each row execute procedure public.validate_inventory_storage_location('vaccine');

drop trigger if exists validate_packaging_inventory_location on public.packaging_inventory;
create trigger validate_packaging_inventory_location
  before insert or update of farm_id, location_id on public.packaging_inventory
  for each row execute procedure public.validate_inventory_storage_location('packaging');

insert into public.feed_inventory (
  farm_id,
  location_id,
  name,
  feed_category,
  feed_type,
  quantity,
  unit,
  status,
  supplier,
  total_cost,
  entry_date,
  lot_number,
  expiration_date,
  notes
)
select
  inventory.farm_id,
  storage_locations.id,
  inventory.name,
  inventory.type,
  inventory.type,
  inventory.quantity,
  coalesce(inventory.unit, 'kg'),
  case
    when inventory.status in ('normal', 'alerta', 'baixo') then inventory.status
    else 'normal'
  end,
  inventory.supplier,
  nullif(inventory.inventory_value, 0),
  coalesce(inventory.arrival_date, current_date),
  inventory.lot_number,
  inventory.expiration_date,
  inventory.notes
from public.inventory
join public.storage_locations
  on storage_locations.farm_id = inventory.farm_id
 and storage_locations.category = 'feed'
 and storage_locations.is_default = true
where not exists (
  select 1
    from public.feed_inventory existing
   where existing.farm_id = inventory.farm_id
     and existing.name = inventory.name
     and existing.lot_number is not distinct from inventory.lot_number
);

do $$
begin
  if exists (
    select 1
      from public.financial_transactions
     where reference is not null
     group by reference
    having count(*) > 1
  ) then
    raise exception 'Duplicate financial transaction references must be resolved before creating the inventory reference index';
  end if;
end;
$$;

create unique index if not exists idx_financial_transactions_reference_unique
  on public.financial_transactions(reference)
  where reference is not null;

create or replace function public.sync_inventory_purchase_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_category text := tg_argv[0];
  reference_prefix text := tg_argv[1];
  inventory_reference text;
  generated_amount numeric(12,2);
  inventory_description text;
begin
  inventory_reference := reference_prefix || ':' || new.id::text;
  generated_amount := coalesce(nullif(new.total_cost, 0), new.quantity * coalesce(new.unit_cost, 0));

  if generated_amount is null or generated_amount <= 0 then
    delete from public.financial_transactions
     where reference = inventory_reference;
    return new;
  end if;

  inventory_description := 'Compra de estoque: ' || new.name;

  insert into public.financial_transactions (
    farm_id,
    date,
    type,
    category,
    description,
    amount,
    reference
  )
  values (
    new.farm_id,
    new.entry_date,
    'expense',
    expense_category,
    inventory_description,
    generated_amount,
    inventory_reference
  )
  on conflict (reference) where reference is not null do update
    set farm_id = excluded.farm_id,
        date = excluded.date,
        type = excluded.type,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount;

  return new;
end;
$$;

drop trigger if exists sync_feed_inventory_purchase_expense on public.feed_inventory;
create trigger sync_feed_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, feed_category, feed_type
  on public.feed_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('feed', 'inventory:feed');

drop trigger if exists sync_vaccine_inventory_purchase_expense on public.vaccine_inventory;
create trigger sync_vaccine_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, target_disease, manufacturer
  on public.vaccine_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('medicines', 'inventory:vaccine');

drop trigger if exists sync_packaging_inventory_purchase_expense on public.packaging_inventory;
create trigger sync_packaging_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, package_type, size, material
  on public.packaging_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('other', 'inventory:packaging');

create table if not exists public.inventory_losses (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  inventory_type text not null check (inventory_type in ('feed', 'vaccine', 'packaging')),
  feed_inventory_id uuid references public.feed_inventory on delete restrict,
  vaccine_inventory_id uuid references public.vaccine_inventory on delete restrict,
  packaging_inventory_id uuid references public.packaging_inventory on delete restrict,
  reason text not null check (reason in ('expiration', 'damage', 'contamination', 'humidity', 'sanitary_disposal', 'manual_adjustment', 'other')),
  quantity numeric(10,2) not null check (quantity > 0),
  loss_date date not null default current_date,
  notes text,
  check (
    (inventory_type = 'feed' and feed_inventory_id is not null and vaccine_inventory_id is null and packaging_inventory_id is null)
    or (inventory_type = 'vaccine' and vaccine_inventory_id is not null and feed_inventory_id is null and packaging_inventory_id is null)
    or (inventory_type = 'packaging' and packaging_inventory_id is not null and feed_inventory_id is null and vaccine_inventory_id is null)
  )
);

create or replace function public.apply_inventory_loss()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item_farm_id uuid;
  item_location_id uuid;
begin
  if new.inventory_type = 'feed' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.feed_inventory
     where id = new.feed_inventory_id
     for update;

    if not found then
      raise exception 'Feed inventory item not found';
    end if;

    update public.feed_inventory
       set quantity = quantity - new.quantity
     where id = new.feed_inventory_id
       and quantity >= new.quantity;
  elsif new.inventory_type = 'vaccine' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.vaccine_inventory
     where id = new.vaccine_inventory_id
     for update;

    if not found then
      raise exception 'Vaccine inventory item not found';
    end if;

    update public.vaccine_inventory
       set quantity = quantity - new.quantity
     where id = new.vaccine_inventory_id
       and quantity >= new.quantity;
  elsif new.inventory_type = 'packaging' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.packaging_inventory
     where id = new.packaging_inventory_id
     for update;

    if not found then
      raise exception 'Packaging inventory item not found';
    end if;

    update public.packaging_inventory
       set quantity = quantity - new.quantity
     where id = new.packaging_inventory_id
       and quantity >= new.quantity;
  end if;

  if item_farm_id <> new.farm_id or item_location_id <> new.location_id then
    raise exception 'Inventory loss farm or location mismatch';
  end if;

  if not found then
    raise exception 'Insufficient inventory quantity for loss';
  end if;

  return new;
end;
$$;

drop trigger if exists apply_inventory_loss_before_insert on public.inventory_losses;
create trigger apply_inventory_loss_before_insert
  before insert on public.inventory_losses
  for each row execute procedure public.apply_inventory_loss();

create or replace function public.safe_delete_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.feed_inventory where location_id = old.id)
    or exists (select 1 from public.vaccine_inventory where location_id = old.id)
    or exists (select 1 from public.packaging_inventory where location_id = old.id)
    or exists (select 1 from public.inventory_losses where location_id = old.id) then
    update public.storage_locations
       set status = 'inactive',
           updated_at = now()
     where id = old.id;
    return null;
  end if;

  return old;
end;
$$;

drop trigger if exists safe_delete_storage_location_before_delete on public.storage_locations;
create trigger safe_delete_storage_location_before_delete
  before delete on public.storage_locations
  for each row execute procedure public.safe_delete_storage_location();

alter table public.storage_locations enable row level security;
alter table public.feed_inventory enable row level security;
alter table public.vaccine_inventory enable row level security;
alter table public.packaging_inventory enable row level security;
alter table public.inventory_losses enable row level security;

create policy "Users can view storage locations of their farm" on public.storage_locations for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert storage locations in their farm" on public.storage_locations for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update storage locations in their farm" on public.storage_locations for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete storage locations in their farm" on public.storage_locations for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view feed inventory of their farm" on public.feed_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert feed inventory in their farm" on public.feed_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update feed inventory in their farm" on public.feed_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete feed inventory in their farm" on public.feed_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view vaccine inventory of their farm" on public.vaccine_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert vaccine inventory in their farm" on public.vaccine_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update vaccine inventory in their farm" on public.vaccine_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete vaccine inventory in their farm" on public.vaccine_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view packaging inventory of their farm" on public.packaging_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert packaging inventory in their farm" on public.packaging_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update packaging inventory in their farm" on public.packaging_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete packaging inventory in their farm" on public.packaging_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view inventory losses of their farm" on public.inventory_losses for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert inventory losses in their farm" on public.inventory_losses for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update inventory losses in their farm" on public.inventory_losses for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete inventory losses in their farm" on public.inventory_losses for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create trigger set_updated_at before update on public.storage_locations for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.feed_inventory for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.vaccine_inventory for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.packaging_inventory for each row execute procedure public.handle_updated_at();

create index if not exists idx_storage_locations_farm_category on public.storage_locations(farm_id, category);
create index if not exists idx_feed_inventory_farm_location on public.feed_inventory(farm_id, location_id);
create index if not exists idx_feed_inventory_farm_entry_date on public.feed_inventory(farm_id, entry_date);
create index if not exists idx_vaccine_inventory_farm_location on public.vaccine_inventory(farm_id, location_id);
create index if not exists idx_vaccine_inventory_farm_entry_date on public.vaccine_inventory(farm_id, entry_date);
create index if not exists idx_packaging_inventory_farm_location on public.packaging_inventory(farm_id, location_id);
create index if not exists idx_packaging_inventory_farm_entry_date on public.packaging_inventory(farm_id, entry_date);
create index if not exists idx_inventory_losses_farm_date on public.inventory_losses(farm_id, loss_date);
create index if not exists idx_inventory_losses_location on public.inventory_losses(location_id);

