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
  eggs_produced int not null check (eggs_produced >= 0),
  broken_eggs int default 0 check (broken_eggs >= 0),
  dirty_eggs int default 0 check (dirty_eggs >= 0),
  discarded_eggs int default 0 check (discarded_eggs >= 0),
  eggs_sold int default 0,
  egg_price numeric(10,2) default 0,
  laying_rate numeric default 0,
  eggs_per_bird numeric default 0
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
  feed_type text default 'Ração Postura'
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
  amount numeric(12,2) not null check (amount > 0),
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
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  location text,
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  street text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  payment_terms text,
  notes text,
  payment_terms_days integer not null default 0 check (payment_terms_days between 0 and 365),
  archived_at timestamptz
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
  customer_id uuid references public.customers on delete restrict,
  date date not null,
  quantity int not null check (quantity > 0),
  egg_type text default 'Branco',
  unit_price numeric(10,2) not null check (unit_price > 0),
  total numeric(12,2) not null check (total > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  notes text,
  due_date date not null,
  paid_at date,
  constraint sales_payment_consistency check (
    (payment_status = 'paid' and paid_at is not null)
    or (payment_status = 'pending' and paid_at is null)
  )
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

alter table public.financial_transactions
  add column sale_id uuid references public.sales(id) on delete cascade;

alter table public.financial_transactions
  add constraint financial_transactions_revenue_source check (
    (type = 'revenue' and sale_id is not null)
    or (type = 'expense' and sale_id is null)
  );

create unique index idx_financial_transactions_sale_unique
  on public.financial_transactions(sale_id)
  where sale_id is not null;

create or replace function public.sync_sale_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
begin
  if new.payment_status <> 'paid' then
    delete from public.financial_transactions
     where sale_id = new.id;
    return new;
  end if;

  select name into customer_name
    from public.customers
   where id = new.customer_id;

  insert into public.financial_transactions (
    farm_id,
    date,
    type,
    category,
    description,
    amount,
    reference,
    sale_id
  ) values (
    new.farm_id,
    new.paid_at,
    'revenue',
    'sales',
    'Venda - ' || coalesce(customer_name, 'Cliente não informado'),
    new.total,
    'sale:' || new.id::text,
    new.id
  )
  on conflict (sale_id) where sale_id is not null do update set
    farm_id = excluded.farm_id,
    date = excluded.date,
    category = excluded.category,
    description = excluded.description,
    amount = excluded.amount,
    reference = excluded.reference;

  return new;
end;
$$;

create trigger sync_sale_revenue
  after insert or update of farm_id, customer_id, total, payment_status, paid_at
  on public.sales
  for each row execute procedure public.sync_sale_revenue();

drop policy "Users can insert transactions in their farm" on public.financial_transactions;
drop policy "Users can update transactions in their farm" on public.financial_transactions;
drop policy "Users can delete transactions in their farm" on public.financial_transactions;

create policy "Users can insert expenses in their farm"
  on public.financial_transactions for insert
  with check (
    type = 'expense'
    and sale_id is null
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );

create policy "Users can update expenses in their farm"
  on public.financial_transactions for update
  using (
    type = 'expense'
    and sale_id is null
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  )
  with check (
    type = 'expense'
    and sale_id is null
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );

create policy "Users can delete expenses in their farm"
  on public.financial_transactions for delete
  using (
    type = 'expense'
    and sale_id is null
    and farm_id in (select id from public.farms where owner_id = auth.uid())
  );

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
create unique index idx_customers_farm_cnpj_unique on public.customers(farm_id, cnpj) where cnpj is not null;
create index idx_customers_farm_archived on public.customers(farm_id, archived_at);
create index idx_sales_farm_date on public.sales(farm_id, date);
create index idx_sales_farm_due_status on public.sales(farm_id, due_date, payment_status);
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

-- ============================================
-- Migration 00041: Single Default Storage Location
-- ============================================

-- Preserve the most recently updated default in each farm/category
-- and demote existing duplicates without deleting any location.
with ranked_defaults as (
  select
    id,
    row_number() over (
      partition by farm_id, category
      order by updated_at desc, created_at desc, id desc
    ) as default_rank
  from public.storage_locations
  where is_default = true
)
update public.storage_locations
set
  is_default = false,
  updated_at = now()
where id in (
  select id
  from ranked_defaults
  where default_rank > 1
);

create or replace function public.enforce_single_default_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_default then
    update public.storage_locations
       set is_default = false,
           updated_at = now()
     where farm_id = new.farm_id
       and category = new.category
       and id <> new.id
       and is_default = true;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_default_storage_location
  on public.storage_locations;

create trigger enforce_single_default_storage_location
  before insert or update of farm_id, category, is_default
  on public.storage_locations
  for each row
  execute procedure public.enforce_single_default_storage_location();

create unique index if not exists
  idx_storage_locations_single_default_per_category
  on public.storage_locations (farm_id, category)
  where is_default = true;

-- ============================================
-- Migration 00042: Inventory Deletion Integrity
-- ============================================

alter table public.feed_consumption
  drop constraint if exists feed_consumption_feed_inventory_id_fkey;

alter table public.feed_consumption
  add constraint feed_consumption_feed_inventory_id_fkey
  foreign key (feed_inventory_id)
  references public.feed_inventory(id)
  on delete cascade;

alter table public.financial_transactions
  drop constraint if exists financial_transactions_feed_inventory_id_fkey,
  drop constraint if exists financial_transactions_medicine_inventory_id_fkey,
  drop constraint if exists financial_transactions_packaging_inventory_id_fkey,
  drop constraint if exists financial_transactions_equipment_inventory_id_fkey;

alter table public.financial_transactions
  add constraint financial_transactions_feed_inventory_id_fkey
    foreign key (feed_inventory_id) references public.feed_inventory(id) on delete cascade,
  add constraint financial_transactions_medicine_inventory_id_fkey
    foreign key (medicine_inventory_id) references public.medicine_inventory(id) on delete cascade,
  add constraint financial_transactions_packaging_inventory_id_fkey
    foreign key (packaging_inventory_id) references public.packaging_inventory(id) on delete cascade,
  add constraint financial_transactions_equipment_inventory_id_fkey
    foreign key (equipment_inventory_id) references public.equipment_inventory(id) on delete cascade;

alter table public.inventory_losses
  drop constraint if exists inventory_losses_feed_inventory_id_fkey,
  drop constraint if exists inventory_losses_vaccine_inventory_id_fkey,
  drop constraint if exists inventory_losses_medicine_inventory_id_fkey,
  drop constraint if exists inventory_losses_packaging_inventory_id_fkey,
  drop constraint if exists inventory_losses_equipment_inventory_id_fkey;

alter table public.inventory_losses
  add constraint inventory_losses_feed_inventory_id_fkey
    foreign key (feed_inventory_id) references public.feed_inventory(id) on delete cascade,
  add constraint inventory_losses_medicine_inventory_id_fkey
    foreign key (medicine_inventory_id) references public.medicine_inventory(id) on delete cascade,
  add constraint inventory_losses_packaging_inventory_id_fkey
    foreign key (packaging_inventory_id) references public.packaging_inventory(id) on delete cascade,
  add constraint inventory_losses_equipment_inventory_id_fkey
    foreign key (equipment_inventory_id) references public.equipment_inventory(id) on delete cascade;

create or replace function public.safe_delete_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  default_location_id uuid;
begin
  if old.is_default then
    raise exception using
      errcode = 'P0001',
      message = 'O local padrão não pode ser excluído.';
  end if;

  select id
    into default_location_id
    from public.storage_locations
   where farm_id = old.farm_id
     and category = old.category
     and is_default = true
     and id <> old.id
   limit 1;

  if default_location_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'O local padrão "Sem local definido" não foi encontrado para esta categoria.';
  end if;

  if old.category = 'feed' then
    update public.feed_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'medicine' then
    update public.medicine_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'packaging' then
    update public.packaging_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'equipment' then
    update public.equipment_inventory
       set location_id = default_location_id
     where location_id = old.id;
  end if;

  update public.inventory_losses
     set location_id = default_location_id
   where location_id = old.id;

  return old;
end;
$$;

-- Notification MVP persistence, authorization, recipient state, and delivery queue.

create table public.notification_settings (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  low_stock_threshold_percent numeric(5,2) not null default 25 check (low_stock_threshold_percent between 0 and 100),
  upcoming_vaccination_days integer not null default 7 check (upcoming_vaccination_days between 0 and 90),
  low_laying_window_days integer not null default 7 check (low_laying_window_days between 1 and 90),
  low_laying_gap_percent numeric(5,2) not null default 5 check (low_laying_gap_percent between 0 and 100),
  high_mortality_window_days integer not null default 7 check (high_mortality_window_days between 1 and 90),
  high_mortality_percent numeric(5,2) not null default 0.5 check (high_mortality_percent between 0 and 100),
  delinquency_days integer not null default 30 check (delinquency_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  category text not null check (category in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text not null,
  entity_type text not null,
  entity_id text not null,
  action_path text not null check (action_path like '/dashboard%'),
  dedup_key text not null,
  status text not null default 'active' check (status in ('active', 'resolved')),
  occurrence_version integer not null default 1 check (occurrence_version > 0),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, dedup_key),
  unique (id, farm_id),
  check ((status = 'active' and resolved_at is null) or (status = 'resolved' and resolved_at is not null))
);

create table public.notification_preferences (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer')),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (farm_id, user_id, category)
);

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_version integer not null check (occurrence_version > 0),
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id, occurrence_version),
  foreign key (notification_id, farm_id) references public.notifications(id, farm_id) on delete cascade
);

create table public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_version integer not null check (occurrence_version > 0),
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'retry', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider_id text,
  idempotency_key text not null unique check (length(idempotency_key) between 1 and 256),
  last_http_status integer,
  last_error_code text,
  last_error_detail text check (last_error_detail is null or length(last_error_detail) <= 500),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id, occurrence_version),
  foreign key (notification_id, farm_id) references public.notifications(id, farm_id) on delete cascade
);

create index idx_notifications_farm_status_category on public.notifications(farm_id, status, category);
create index idx_notifications_farm_detected on public.notifications(farm_id, last_detected_at desc);
create index idx_notification_recipients_user_state on public.notification_recipients(user_id, read_at, dismissed_at);
create index idx_notification_recipients_farm_user_created on public.notification_recipients(farm_id, user_id, created_at desc);
create index idx_notification_preferences_user_farm on public.notification_preferences(user_id, farm_id);
create index idx_notification_email_deliveries_queue on public.notification_email_deliveries(status, next_attempt_at);
create index idx_notification_email_deliveries_user_created on public.notification_email_deliveries(farm_id, user_id, created_at desc);

alter table public.notification_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.notification_email_deliveries enable row level security;

create policy "Farm members can view notification settings"
  on public.notification_settings for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.farm_id = notification_settings.farm_id
  ) or exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Farm owners can insert notification settings"
  on public.notification_settings for insert
  with check (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Farm owners can update notification settings"
  on public.notification_settings for update
  using (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.farms
    where farms.id = notification_settings.farm_id and farms.owner_id = auth.uid()
  ));

create policy "Recipients can view notifications"
  on public.notifications for select
  using (exists (
    select 1
    from public.notification_recipients recipient
    where recipient.notification_id = notifications.id
      and recipient.occurrence_version = notifications.occurrence_version
      and recipient.user_id = auth.uid()
  ));

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_preferences.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_preferences.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can view own notification recipients"
  on public.notification_recipients for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can update own notification recipients"
  on public.notification_recipients for update
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  )
  with check (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_recipients.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_recipients.farm_id and farms.owner_id = auth.uid()
    ))
  );

create policy "Users can view own notification email deliveries"
  on public.notification_email_deliveries for select
  using (
    user_id = auth.uid()
    and (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.farm_id = notification_email_deliveries.farm_id
    ) or exists (
      select 1 from public.farms
      where farms.id = notification_email_deliveries.farm_id and farms.owner_id = auth.uid()
    ))
  );

revoke insert, update, delete on public.notifications from anon, authenticated;
revoke insert, delete on public.notification_recipients from anon, authenticated;
revoke update on public.notification_recipients from anon, authenticated;
grant update (read_at, dismissed_at, updated_at) on public.notification_recipients to authenticated;
revoke insert, update, delete on public.notification_email_deliveries from anon, authenticated;

create or replace function public.sync_notification_channels(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_notification public.notifications%rowtype;
begin
  select * into target_notification
  from public.notifications
  where id = p_notification_id and status = 'active';

  if not found then
    return;
  end if;

  insert into public.notification_recipients (
    notification_id, farm_id, user_id, occurrence_version
  )
  select
    target_notification.id,
    target_notification.farm_id,
    recipient.id,
    target_notification.occurrence_version
  from (
    select profile.id, profile.email
    from public.profiles profile
    where profile.farm_id = target_notification.farm_id
    union
    select profile.id, profile.email
    from public.profiles profile
    join public.farms farm on farm.owner_id = profile.id
    where farm.id = target_notification.farm_id
  ) recipient
  left join public.notification_preferences preference
    on preference.farm_id = target_notification.farm_id
   and preference.user_id = recipient.id
   and preference.category = target_notification.category
  where coalesce(preference.in_app_enabled, true)
  on conflict (notification_id, user_id, occurrence_version) do nothing;

  insert into public.notification_email_deliveries (
    notification_id,
    farm_id,
    user_id,
    occurrence_version,
    recipient_email,
    idempotency_key
  )
  select
    target_notification.id,
    target_notification.farm_id,
    recipient.id,
    target_notification.occurrence_version,
    recipient.email,
    'notification/' || target_notification.id::text || '/' || target_notification.occurrence_version::text || '/' || recipient.id::text
  from (
    select profile.id, profile.email
    from public.profiles profile
    where profile.farm_id = target_notification.farm_id
    union
    select profile.id, profile.email
    from public.profiles profile
    join public.farms farm on farm.owner_id = profile.id
    where farm.id = target_notification.farm_id
  ) recipient
  left join public.notification_preferences preference
    on preference.farm_id = target_notification.farm_id
   and preference.user_id = recipient.id
   and preference.category = target_notification.category
  where coalesce(preference.email_enabled, true)
  on conflict (notification_id, user_id, occurrence_version) do nothing;
end;
$$;

create or replace function public.upsert_notification_condition(
  p_farm_id uuid,
  p_category text,
  p_severity text,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id text,
  p_action_path text,
  p_dedup_key text,
  p_data jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_notification public.notifications%rowtype;
  saved_notification public.notifications%rowtype;
begin
  if p_category not in ('low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer') then
    raise exception 'Invalid notification category';
  end if;
  if p_severity not in ('info', 'warning', 'critical') then
    raise exception 'Invalid notification severity';
  end if;
  if p_action_path not like '/dashboard%' then
    raise exception 'Invalid notification action path';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_farm_id::text || ':' || p_dedup_key, 0));

  select * into existing_notification
  from public.notifications
  where farm_id = p_farm_id and dedup_key = p_dedup_key
  for update;

  if not found then
    insert into public.notifications (
      farm_id, category, severity, title, body, entity_type, entity_id,
      action_path, dedup_key, data
    ) values (
      p_farm_id, p_category, p_severity, p_title, p_body, p_entity_type,
      p_entity_id, p_action_path, p_dedup_key, coalesce(p_data, '{}'::jsonb)
    ) returning * into saved_notification;
  elsif existing_notification.status = 'resolved' then
    update public.notifications
    set category = p_category,
        severity = p_severity,
        title = p_title,
        body = p_body,
        entity_type = p_entity_type,
        entity_id = p_entity_id,
        action_path = p_action_path,
        status = 'active',
        occurrence_version = occurrence_version + 1,
        occurrence_count = occurrence_count + 1,
        first_detected_at = now(),
        last_detected_at = now(),
        resolved_at = null,
        data = coalesce(p_data, '{}'::jsonb),
        updated_at = now()
    where id = existing_notification.id
    returning * into saved_notification;
  else
    update public.notifications
    set category = p_category,
        severity = p_severity,
        title = p_title,
        body = p_body,
        entity_type = p_entity_type,
        entity_id = p_entity_id,
        action_path = p_action_path,
        last_detected_at = now(),
        data = coalesce(p_data, '{}'::jsonb),
        updated_at = now()
    where id = existing_notification.id
    returning * into saved_notification;
  end if;

  perform public.sync_notification_channels(saved_notification.id);
  return saved_notification;
end;
$$;

create or replace function public.resolve_notification_condition(
  p_farm_id uuid,
  p_dedup_key text
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_notification public.notifications%rowtype;
begin
  update public.notifications
  set status = 'resolved',
      resolved_at = now(),
      updated_at = now()
  where farm_id = p_farm_id
    and dedup_key = p_dedup_key
    and status = 'active'
  returning * into saved_notification;

  return saved_notification;
end;
$$;

create or replace function public.seed_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.farm_id is not null then
    insert into public.notification_preferences (farm_id, user_id, category)
    select new.farm_id, new.id, category
    from unnest(array['low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer']) category
    on conflict (farm_id, user_id, category) do nothing;
  end if;
  return new;
end;
$$;

insert into public.notification_preferences (farm_id, user_id, category)
select profile.farm_id, profile.id, category
from public.profiles profile
cross join unnest(array['low_inventory', 'vaccination', 'low_laying_rate', 'high_mortality', 'delinquent_customer']) category
where profile.farm_id is not null
on conflict (farm_id, user_id, category) do nothing;

drop trigger if exists seed_notification_preferences_on_profile on public.profiles;
create trigger seed_notification_preferences_on_profile
  after insert or update of farm_id on public.profiles
  for each row execute procedure public.seed_notification_preferences();

create or replace function public.claim_notification_email_deliveries(p_limit integer default 4)
returns setof public.notification_email_deliveries
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.notification_email_deliveries
    where (
      status in ('pending', 'retry') and next_attempt_at <= now()
    ) or (
      status = 'processing' and locked_at < now() - interval '10 minutes'
    )
    order by next_attempt_at, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 4), 20))
  )
  update public.notification_email_deliveries delivery
  set status = 'processing',
      attempt_count = delivery.attempt_count + 1,
      locked_at = now(),
      updated_at = now()
  from candidates
  where delivery.id = candidates.id
  returning delivery.*;
$$;

create or replace function public.complete_notification_email_delivery(
  p_delivery_id uuid,
  p_provider_id text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_email_deliveries
  set status = 'sent',
      provider_id = p_provider_id,
      sent_at = now(),
      locked_at = null,
      last_http_status = null,
      last_error_code = null,
      last_error_detail = null,
      updated_at = now()
  where id = p_delivery_id and status = 'processing';
$$;

create or replace function public.fail_notification_email_delivery(
  p_delivery_id uuid,
  p_terminal boolean,
  p_next_attempt_at timestamptz,
  p_http_status integer,
  p_error_code text,
  p_error_detail text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_email_deliveries
  set status = case when p_terminal or attempt_count >= 6 then 'failed' else 'retry' end,
      next_attempt_at = case when p_terminal or attempt_count >= 6 then next_attempt_at else p_next_attempt_at end,
      locked_at = null,
      last_http_status = p_http_status,
      last_error_code = left(p_error_code, 100),
      last_error_detail = left(p_error_detail, 500),
      updated_at = now()
  where id = p_delivery_id and status = 'processing';
$$;

revoke all on function public.sync_notification_channels(uuid) from public, anon, authenticated;
revoke all on function public.upsert_notification_condition(uuid, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.resolve_notification_condition(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_notification_email_deliveries(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_email_delivery(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_notification_email_delivery(uuid, boolean, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function public.seed_notification_preferences() from public, anon, authenticated;

grant execute on function public.upsert_notification_condition(uuid, text, text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.resolve_notification_condition(uuid, text) to service_role;
grant execute on function public.claim_notification_email_deliveries(integer) to service_role;
grant execute on function public.complete_notification_email_delivery(uuid, text) to service_role;
grant execute on function public.fail_notification_email_delivery(uuid, boolean, timestamptz, integer, text, text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_recipients'
  ) then
    alter publication supabase_realtime add table public.notification_recipients;
  end if;
end;
$$;

-- Notification condition generators and Supabase-based scheduling.

create or replace function public.resolve_notification_condition(
  p_farm_id uuid,
  p_dedup_key text
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_notification public.notifications%rowtype;
begin
  update public.notifications
  set status = 'resolved',
      resolved_at = now(),
      updated_at = now()
  where farm_id = p_farm_id
    and dedup_key = p_dedup_key
    and status = 'active'
  returning * into saved_notification;

  if saved_notification.id is not null then
    update public.notification_recipients
    set updated_at = now()
    where notification_id = saved_notification.id
      and occurrence_version = saved_notification.occurrence_version;
  end if;

  return saved_notification;
end;
$$;

create or replace function public.evaluate_farm_notification_conditions(
  p_farm_id uuid,
  p_today date default ((now() at time zone 'America/Sao_Paulo')::date)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_record record;
  item_record record;
  vaccine_record record;
  customer_record record;
  production_record record;
  mortality_record record;
  notification_record record;
  active_keys text[];
  condition_key text;
  stock_percent numeric;
  production_start date;
  mortality_start date;
  actual_laying_rate numeric;
  expected_laying_rate numeric;
  mortality_rate numeric;
  generated_count integer := 0;
  resolved_count integer := 0;
begin
  if p_farm_id is null or not exists (select 1 from public.farms where id = p_farm_id) then
    return jsonb_build_object('generated', 0, 'resolved', 0);
  end if;

  select
    coalesce(setting.low_stock_threshold_percent, 25)::numeric as low_stock_threshold_percent,
    coalesce(setting.upcoming_vaccination_days, 7) as upcoming_vaccination_days,
    coalesce(setting.low_laying_window_days, 7) as low_laying_window_days,
    coalesce(setting.low_laying_gap_percent, 5)::numeric as low_laying_gap_percent,
    coalesce(setting.high_mortality_window_days, 7) as high_mortality_window_days,
    coalesce(setting.high_mortality_percent, 0.5)::numeric as high_mortality_percent,
    coalesce(setting.delinquency_days, 30) as delinquency_days
  into settings_record
  from (select 1) singleton
  left join public.notification_settings setting on setting.farm_id = p_farm_id;

  active_keys := array[]::text[];
  for item_record in
    select 'feed_inventory'::text as entity_type, id, name, quantity, minimum_quantity, unit
    from public.feed_inventory where farm_id = p_farm_id
    union all
    select 'medicine_inventory', id, name, quantity, minimum_quantity, unit
    from public.medicine_inventory where farm_id = p_farm_id
    union all
    select 'packaging_inventory', id, name, quantity, minimum_quantity, unit
    from public.packaging_inventory where farm_id = p_farm_id
    union all
    select 'equipment_inventory', id, name, quantity, minimum_quantity, unit
    from public.equipment_inventory where farm_id = p_farm_id
  loop
    stock_percent := case
      when item_record.minimum_quantity <= 0 then case when item_record.quantity > 0 then 100 else 0 end
      else least(100, round((item_record.quantity / item_record.minimum_quantity) * 100))
    end;
    condition_key := 'low_inventory:' || item_record.entity_type || ':' || item_record.id::text;

    if stock_percent <= settings_record.low_stock_threshold_percent then
      active_keys := array_append(active_keys, condition_key);
      perform public.upsert_notification_condition(
        p_farm_id,
        'low_inventory',
        case when item_record.quantity <= 0 then 'critical' else 'warning' end,
        'Estoque baixo: ' || item_record.name,
        'O estoque atual está em ' || trim(to_char(stock_percent, 'FM999990D0')) || '% do mínimo configurado.',
        item_record.entity_type,
        item_record.id::text,
        '/dashboard/inventory',
        condition_key,
        jsonb_build_object('stock_percent', stock_percent, 'quantity', item_record.quantity, 'unit', item_record.unit)
      );
      generated_count := generated_count + 1;
    end if;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'low_inventory' and status = 'active'
      and dedup_key like 'low_inventory:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  active_keys := array[]::text[];
  for vaccine_record in
    select id, title, date, flock_id
    from public.health_records
    where farm_id = p_farm_id
      and type = 'vaccination'
      and status in ('scheduled', 'upcoming')
      and date <= p_today + settings_record.upcoming_vaccination_days
  loop
    condition_key := 'vaccination:health_record:' || vaccine_record.id::text;
    active_keys := array_append(active_keys, condition_key);
    perform public.upsert_notification_condition(
      p_farm_id,
      'vaccination',
      case when vaccine_record.date < p_today then 'critical' else 'warning' end,
      case when vaccine_record.date < p_today then 'Vacinação atrasada' else 'Vacinação próxima' end,
      vaccine_record.title || ' — ' || case
        when vaccine_record.date < p_today then 'prevista para ' || to_char(vaccine_record.date, 'DD/MM/YYYY')
        else 'agendada para ' || to_char(vaccine_record.date, 'DD/MM/YYYY')
      end || '.',
      'health_record',
      vaccine_record.id::text,
      case when vaccine_record.flock_id is null then '/dashboard/health'
        else '/dashboard/flocks/detalhes/' || vaccine_record.flock_id::text || '/saude' end,
      condition_key,
      jsonb_build_object('scheduled_date', vaccine_record.date, 'overdue', vaccine_record.date < p_today)
    );
    generated_count := generated_count + 1;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'vaccination' and status = 'active'
      and dedup_key like 'vaccination:health_record:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  production_start := p_today - greatest(settings_record.low_laying_window_days - 1, 0);
  with daily_production as (
    select
      production.date,
      flock.id as flock_id,
      sum(production.eggs_produced)::numeric as eggs_produced,
      greatest(
        flock.bird_count - coalesce((
          select sum(death.dead_birds)
          from public.mortality death
          where death.farm_id = p_farm_id
            and death.flock_id = flock.id
            and death.date <= production.date
        ), 0),
        0
      )::numeric as live_birds,
      case
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 18 then 0
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 22 then 28
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 25 then 70
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 35 then 96
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 60 then 93
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) < 75 then 88
        when flock.arrival_age_weeks + floor((production.date - flock.arrival_date) / 7.0) <= 90 then 80
        else 68
      end::numeric as expected_rate
    from public.egg_production production
    join public.flocks flock on flock.id = production.flock_id and flock.farm_id = p_farm_id
    where production.farm_id = p_farm_id
      and production.date between production_start and p_today
      and lower(flock.status) <> 'descarte'
    group by production.date, flock.id
  )
  select
    count(*) as recorded_days,
    coalesce(sum(eggs_produced), 0) as total_eggs,
    coalesce(sum(live_birds), 0) as eligible_bird_days,
    coalesce(sum(live_birds * expected_rate / 100), 0) as expected_eggs
  into production_record
  from daily_production
  where live_birds > 0 and expected_rate > 0;

  condition_key := 'low_laying_rate:farm:' || p_farm_id::text;
  if production_record.recorded_days > 0 and production_record.eligible_bird_days > 0 then
    actual_laying_rate := production_record.total_eggs / production_record.eligible_bird_days * 100;
    expected_laying_rate := production_record.expected_eggs / production_record.eligible_bird_days * 100;
  else
    actual_laying_rate := null;
    expected_laying_rate := null;
  end if;

  if actual_laying_rate is not null
    and actual_laying_rate < expected_laying_rate - settings_record.low_laying_gap_percent then
    perform public.upsert_notification_condition(
      p_farm_id,
      'low_laying_rate',
      'warning',
      'Taxa de postura abaixo do esperado',
      'A média dos últimos ' || settings_record.low_laying_window_days || ' dias registrados foi '
        || trim(to_char(actual_laying_rate, 'FM999990D0')) || '%, frente a '
        || trim(to_char(expected_laying_rate, 'FM999990D0')) || '% esperados.',
      'farm',
      p_farm_id::text,
      '/dashboard/production',
      condition_key,
      jsonb_build_object(
        'actual_rate', round(actual_laying_rate, 2),
        'expected_rate', round(expected_laying_rate, 2),
        'window_start', production_start,
        'window_end', p_today,
        'recorded_days', production_record.recorded_days
      )
    );
    generated_count := generated_count + 1;
  elsif exists (
    select 1 from public.notifications notification
    where notification.farm_id = p_farm_id
      and notification.dedup_key = condition_key
      and notification.status = 'active'
  ) then
    perform public.resolve_notification_condition(p_farm_id, condition_key);
    resolved_count := resolved_count + 1;
  end if;

  mortality_start := p_today - greatest(settings_record.high_mortality_window_days - 1, 0);
  select
    coalesce((select sum(dead_birds) from public.mortality
      where farm_id = p_farm_id and date between mortality_start and p_today), 0)::numeric as deaths,
    coalesce((select sum(bird_count) from public.flocks
      where farm_id = p_farm_id and lower(status) <> 'descarte'), 0)::numeric as birds
  into mortality_record;

  mortality_rate := case when mortality_record.birds > 0
    then mortality_record.deaths / mortality_record.birds * 100 else null end;
  condition_key := 'high_mortality:farm:' || p_farm_id::text;

  if mortality_rate is not null and mortality_rate > settings_record.high_mortality_percent then
    perform public.upsert_notification_condition(
      p_farm_id,
      'high_mortality',
      'critical',
      'Mortalidade acima do limite',
      'A mortalidade dos últimos ' || settings_record.high_mortality_window_days || ' dias chegou a '
        || trim(to_char(mortality_rate, 'FM999990D00')) || '%.',
      'farm',
      p_farm_id::text,
      '/dashboard/mortality',
      condition_key,
      jsonb_build_object(
        'mortality_rate', round(mortality_rate, 3),
        'dead_birds', mortality_record.deaths,
        'bird_count', mortality_record.birds,
        'window_start', mortality_start,
        'window_end', p_today
      )
    );
    generated_count := generated_count + 1;
  elsif exists (
    select 1 from public.notifications notification
    where notification.farm_id = p_farm_id
      and notification.dedup_key = condition_key
      and notification.status = 'active'
  ) then
    perform public.resolve_notification_condition(p_farm_id, condition_key);
    resolved_count := resolved_count + 1;
  end if;

  active_keys := array[]::text[];
  for customer_record in
    select customer.id, customer.name, count(sale.id) as sale_count, sum(sale.total) as overdue_total
    from public.customers customer
    join public.sales sale on sale.customer_id = customer.id and sale.farm_id = p_farm_id
    where customer.farm_id = p_farm_id
      and sale.payment_status = 'pending'
      and p_today - sale.due_date >= settings_record.delinquency_days
    group by customer.id, customer.name
  loop
    condition_key := 'delinquent_customer:customer:' || customer_record.id::text;
    active_keys := array_append(active_keys, condition_key);
    perform public.upsert_notification_condition(
      p_farm_id,
      'delinquent_customer',
      'warning',
      'Cliente inadimplente: ' || customer_record.name,
      customer_record.sale_count || case when customer_record.sale_count = 1
        then ' venda permanece pendente há ' || settings_record.delinquency_days || ' dias ou mais.'
        else ' vendas permanecem pendentes há ' || settings_record.delinquency_days || ' dias ou mais.' end,
      'customer',
      customer_record.id::text,
      '/dashboard/customers',
      condition_key,
      jsonb_build_object('sale_count', customer_record.sale_count, 'overdue_total', customer_record.overdue_total)
    );
    generated_count := generated_count + 1;
  end loop;

  for notification_record in
    select dedup_key from public.notifications
    where farm_id = p_farm_id and category = 'delinquent_customer' and status = 'active'
      and dedup_key like 'delinquent_customer:customer:%'
      and not (dedup_key = any(active_keys))
  loop
    perform public.resolve_notification_condition(p_farm_id, notification_record.dedup_key);
    resolved_count := resolved_count + 1;
  end loop;

  return jsonb_build_object('generated', generated_count, 'resolved', resolved_count);
end;
$$;

create or replace function public.evaluate_all_notification_conditions(
  p_today date default ((now() at time zone 'America/Sao_Paulo')::date)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  farm_record record;
  evaluated_count integer := 0;
  failed_farms jsonb := '[]'::jsonb;
begin
  for farm_record in select id from public.farms loop
    begin
      perform public.evaluate_farm_notification_conditions(farm_record.id, p_today);
      evaluated_count := evaluated_count + 1;
    exception when others then
      failed_farms := failed_farms || jsonb_build_array(
        jsonb_build_object('farm_id', farm_record.id, 'error', left(sqlerrm, 300))
      );
    end;
  end loop;

  return jsonb_build_object('evaluated_farms', evaluated_count, 'failures', failed_farms);
end;
$$;

create or replace function public.trigger_farm_notification_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_farm_id uuid;
  previous_farm_id uuid;
begin
  if tg_op <> 'DELETE' then current_farm_id := new.farm_id; end if;
  if tg_op <> 'INSERT' then previous_farm_id := old.farm_id; end if;

  if current_farm_id is not null then
    perform public.evaluate_farm_notification_conditions(
      current_farm_id,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;
  if previous_farm_id is not null and previous_farm_id is distinct from current_farm_id then
    perform public.evaluate_farm_notification_conditions(
      previous_farm_id,
      (now() at time zone 'America/Sao_Paulo')::date
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  source_table text;
  trigger_name text;
begin
  foreach source_table in array array[
    'feed_inventory', 'medicine_inventory', 'packaging_inventory', 'equipment_inventory',
    'health_records', 'egg_production', 'mortality', 'flocks', 'sales', 'notification_settings'
  ] loop
    trigger_name := 'evaluate_notifications_after_' || source_table;
    execute format('drop trigger if exists %I on public.%I', trigger_name, source_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute procedure public.trigger_farm_notification_evaluation()',
      trigger_name,
      source_table
    );
  end loop;
end;
$$;

revoke all on function public.evaluate_farm_notification_conditions(uuid, date) from public, anon, authenticated;
revoke all on function public.evaluate_all_notification_conditions(date) from public, anon, authenticated;
revoke all on function public.trigger_farm_notification_evaluation() from public, anon, authenticated;
grant execute on function public.evaluate_farm_notification_conditions(uuid, date) to service_role;
grant execute on function public.evaluate_all_notification_conditions(date) to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'granjapro-notification-evaluation';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'granjapro-notification-evaluation',
    '15 11 * * *',
    'select public.evaluate_all_notification_conditions((now() at time zone ''America/Sao_Paulo'')::date);'
  );
end;
$$;

-- Dispatch the persisted notification email queue through the application server.

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_notification_email_processor()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  processor_url text;
  processor_secret text;
  request_id bigint;
begin
  select decrypted_secret into processor_url
  from vault.decrypted_secrets
  where name = 'notification_processor_url'
  limit 1;

  select decrypted_secret into processor_secret
  from vault.decrypted_secrets
  where name = 'notification_processor_secret'
  limit 1;

  if processor_url is null or processor_secret is null then
    return null;
  end if;
  if processor_url !~ '^https://[^[:space:]]+$' then
    raise exception 'notification_processor_url must be an HTTPS URL';
  end if;

  select net.http_post(
    url := processor_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || processor_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.dispatch_notification_email_processor() from public, anon, authenticated;
grant execute on function public.dispatch_notification_email_processor() to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'granjapro-notification-email-processor';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'granjapro-notification-email-processor',
    '* * * * *',
    'select public.dispatch_notification_email_processor();'
  );
end;
$$;
