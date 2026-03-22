-- ============================================
-- Granja Pro – Migration 00001: Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This migration is idempotent (safe to re-run)
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (linked to auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  email text not null,
  full_name text not null,
  farm_id uuid,
  role text default 'owner' check (role in ('owner', 'manager', 'worker')),
  avatar_url text
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view own profile') then
    create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. FARMS
-- ============================================
create table if not exists public.farms (
  id uuid default extensions.uuid_generate_v4() primary key,
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'farms' and policyname = 'Users can view own farms') then
    create policy "Users can view own farms" on public.farms for select
      using (owner_id = auth.uid() or id in (select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'farms' and policyname = 'Owners can insert farms') then
    create policy "Owners can insert farms" on public.farms for insert with check (owner_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'farms' and policyname = 'Owners can update own farms') then
    create policy "Owners can update own farms" on public.farms for update using (owner_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'farms' and policyname = 'Owners can delete own farms') then
    create policy "Owners can delete own farms" on public.farms for delete using (owner_id = auth.uid());
  end if;
end $$;

-- Add foreign key from profiles to farms
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_farm_id_fkey' and table_name = 'profiles'
  ) then
    alter table public.profiles
      add constraint profiles_farm_id_fkey
      foreign key (farm_id) references public.farms(id) on delete set null;
  end if;
end $$;

-- ============================================
-- 3. BARNS
-- ============================================
create table if not exists public.barns (
  id uuid default extensions.uuid_generate_v4() primary key,
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'barns' and policyname = 'Users can view barns of their farm') then
    create policy "Users can view barns of their farm" on public.barns for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'barns' and policyname = 'Users can insert barns in their farm') then
    create policy "Users can insert barns in their farm" on public.barns for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'barns' and policyname = 'Users can update barns in their farm') then
    create policy "Users can update barns in their farm" on public.barns for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'barns' and policyname = 'Users can delete barns in their farm') then
    create policy "Users can delete barns in their farm" on public.barns for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 4. FLOCKS
-- ============================================
create table if not exists public.flocks (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  code text not null,
  breed text not null,
  lineage text,
  bird_count int not null,
  age_weeks int default 0,
  arrival_date date not null,
  production_start_date date,
  avg_weight_kg numeric(5,2),
  supplier text,
  supplier_contact text,
  origin text,
  production_system text default 'Convencional',
  status text default 'active' check (status in ('active', 'growing', 'declining', 'disposed'))
);

alter table public.flocks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'flocks' and policyname = 'Users can view flocks of their farm') then
    create policy "Users can view flocks of their farm" on public.flocks for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'flocks' and policyname = 'Users can insert flocks in their farm') then
    create policy "Users can insert flocks in their farm" on public.flocks for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'flocks' and policyname = 'Users can update flocks in their farm') then
    create policy "Users can update flocks in their farm" on public.flocks for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'flocks' and policyname = 'Users can delete flocks in their farm') then
    create policy "Users can delete flocks in their farm" on public.flocks for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 5. EGG PRODUCTION
-- ============================================
create table if not exists public.egg_production (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'egg_production' and policyname = 'Users can view egg production of their farm') then
    create policy "Users can view egg production of their farm" on public.egg_production for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'egg_production' and policyname = 'Users can insert egg production in their farm') then
    create policy "Users can insert egg production in their farm" on public.egg_production for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'egg_production' and policyname = 'Users can update egg production in their farm') then
    create policy "Users can update egg production in their farm" on public.egg_production for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'egg_production' and policyname = 'Users can delete egg production in their farm') then
    create policy "Users can delete egg production in their farm" on public.egg_production for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 6. FEED CONSUMPTION
-- ============================================
create table if not exists public.feed_consumption (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
  date date not null,
  quantity_kg numeric(10,2) not null,
  cost numeric(10,2) default 0,
  feed_type text default 'Ração Postura',
  cost_per_egg numeric(10,4) default 0
);

alter table public.feed_consumption enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feed_consumption' and policyname = 'Users can view feed consumption of their farm') then
    create policy "Users can view feed consumption of their farm" on public.feed_consumption for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feed_consumption' and policyname = 'Users can insert feed consumption in their farm') then
    create policy "Users can insert feed consumption in their farm" on public.feed_consumption for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feed_consumption' and policyname = 'Users can update feed consumption in their farm') then
    create policy "Users can update feed consumption in their farm" on public.feed_consumption for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feed_consumption' and policyname = 'Users can delete feed consumption in their farm') then
    create policy "Users can delete feed consumption in their farm" on public.feed_consumption for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 7. MORTALITY
-- ============================================
create table if not exists public.mortality (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
  date date not null,
  dead_birds int not null,
  cause text default 'Natural',
  mortality_rate numeric(5,2) default 0,
  notes text
);

alter table public.mortality enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'mortality' and policyname = 'Users can view mortality of their farm') then
    create policy "Users can view mortality of their farm" on public.mortality for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'mortality' and policyname = 'Users can insert mortality in their farm') then
    create policy "Users can insert mortality in their farm" on public.mortality for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'mortality' and policyname = 'Users can update mortality in their farm') then
    create policy "Users can update mortality in their farm" on public.mortality for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'mortality' and policyname = 'Users can delete mortality in their farm') then
    create policy "Users can delete mortality in their farm" on public.mortality for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 8. FINANCIAL TRANSACTIONS
-- ============================================
create table if not exists public.financial_transactions (
  id uuid default extensions.uuid_generate_v4() primary key,
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'financial_transactions' and policyname = 'Users can view transactions of their farm') then
    create policy "Users can view transactions of their farm" on public.financial_transactions for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'financial_transactions' and policyname = 'Users can insert transactions in their farm') then
    create policy "Users can insert transactions in their farm" on public.financial_transactions for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'financial_transactions' and policyname = 'Users can update transactions in their farm') then
    create policy "Users can update transactions in their farm" on public.financial_transactions for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'financial_transactions' and policyname = 'Users can delete transactions in their farm') then
    create policy "Users can delete transactions in their farm" on public.financial_transactions for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 9. CUSTOMERS
-- ============================================
create table if not exists public.customers (
  id uuid default extensions.uuid_generate_v4() primary key,
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'customers' and policyname = 'Users can view customers of their farm') then
    create policy "Users can view customers of their farm" on public.customers for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'customers' and policyname = 'Users can insert customers in their farm') then
    create policy "Users can insert customers in their farm" on public.customers for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'customers' and policyname = 'Users can update customers in their farm') then
    create policy "Users can update customers in their farm" on public.customers for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'customers' and policyname = 'Users can delete customers in their farm') then
    create policy "Users can delete customers in their farm" on public.customers for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 10. SALES
-- ============================================
create table if not exists public.sales (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  customer_id uuid references public.customers on delete set null,
  date date not null,
  quantity int not null,
  egg_type text default 'Branco',
  unit_price numeric(10,2) not null,
  total numeric(12,2) not null,
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'overdue')),
  notes text
);

alter table public.sales enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sales' and policyname = 'Users can view sales of their farm') then
    create policy "Users can view sales of their farm" on public.sales for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sales' and policyname = 'Users can insert sales in their farm') then
    create policy "Users can insert sales in their farm" on public.sales for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sales' and policyname = 'Users can update sales in their farm') then
    create policy "Users can update sales in their farm" on public.sales for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'sales' and policyname = 'Users can delete sales in their farm') then
    create policy "Users can delete sales in their farm" on public.sales for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 11. TASKS
-- ============================================
create table if not exists public.tasks (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  title text not null,
  done boolean default false,
  scheduled_time time,
  date date not null,
  assigned_to uuid references public.profiles on delete set null
);

alter table public.tasks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can view tasks of their farm') then
    create policy "Users can view tasks of their farm" on public.tasks for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can insert tasks in their farm') then
    create policy "Users can insert tasks in their farm" on public.tasks for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can update tasks in their farm') then
    create policy "Users can update tasks in their farm" on public.tasks for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can delete tasks in their farm') then
    create policy "Users can delete tasks in their farm" on public.tasks for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 12. ALERTS
-- ============================================
create table if not exists public.alerts (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  type text default 'info' check (type in ('info', 'warning', 'error')),
  message text not null,
  read boolean default false,
  resolved boolean default false
);

alter table public.alerts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'Users can view alerts of their farm') then
    create policy "Users can view alerts of their farm" on public.alerts for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'Users can insert alerts in their farm') then
    create policy "Users can insert alerts in their farm" on public.alerts for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'Users can update alerts in their farm') then
    create policy "Users can update alerts in their farm" on public.alerts for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

-- ============================================
-- 13. INDEXES (idempotent with IF NOT EXISTS)
-- ============================================
create index if not exists idx_barns_farm_id on public.barns(farm_id);
create index if not exists idx_flocks_farm_id on public.flocks(farm_id);
create index if not exists idx_flocks_barn_id on public.flocks(barn_id);
create index if not exists idx_egg_production_farm_date on public.egg_production(farm_id, date);
create index if not exists idx_feed_consumption_farm_date on public.feed_consumption(farm_id, date);
create index if not exists idx_mortality_farm_date on public.mortality(farm_id, date);
create index if not exists idx_financial_farm_date on public.financial_transactions(farm_id, date);
create index if not exists idx_customers_farm_id on public.customers(farm_id);
create index if not exists idx_sales_farm_date on public.sales(farm_id, date);
create index if not exists idx_tasks_farm_date on public.tasks(farm_id, date);
create index if not exists idx_alerts_farm_id on public.alerts(farm_id);
create index if not exists idx_profiles_farm_id on public.profiles(farm_id);

-- ============================================
-- 14. UPDATED_AT auto-trigger
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at on public.farms;
create trigger set_updated_at before update on public.farms
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at on public.barns;
create trigger set_updated_at before update on public.barns
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at on public.flocks;
create trigger set_updated_at before update on public.flocks
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute procedure public.handle_updated_at();
