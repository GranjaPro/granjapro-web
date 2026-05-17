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
  title text not null,
  done boolean default false,
  scheduled_time time,
  date date not null,
  assigned_to uuid references public.profiles on delete cascade
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
create index idx_mortality_farm_date on public.mortality(farm_id, date);
create index idx_financial_farm_date on public.financial_transactions(farm_id, date);
create index idx_customers_farm_id on public.customers(farm_id);
create index idx_sales_farm_date on public.sales(farm_id, date);
create index idx_tasks_farm_date on public.tasks(farm_id, date);
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
