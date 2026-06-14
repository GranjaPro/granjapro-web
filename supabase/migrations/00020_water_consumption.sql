-- ============================================
-- Migration 00020: Add water consumption table
-- ============================================

create table if not exists public.water_consumption (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  barn_id uuid references public.barns on delete set null,
  flock_id uuid references public.flocks on delete set null,
  date date not null,
  quantity_liters numeric(10,2) not null
);

alter table public.water_consumption enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'water_consumption' and policyname = 'Users can view water consumption of their farm') then
    create policy "Users can view water consumption of their farm" on public.water_consumption for select
      using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'water_consumption' and policyname = 'Users can insert water consumption in their farm') then
    create policy "Users can insert water consumption in their farm" on public.water_consumption for insert
      with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'water_consumption' and policyname = 'Users can update water consumption in their farm') then
    create policy "Users can update water consumption in their farm" on public.water_consumption for update
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'water_consumption' and policyname = 'Users can delete water consumption in their farm') then
    create policy "Users can delete water consumption in their farm" on public.water_consumption for delete
      using (farm_id in (select id from public.farms where owner_id = auth.uid()));
  end if;
end $$;

create index if not exists idx_water_consumption_farm_date on public.water_consumption(farm_id, date);
create index if not exists idx_water_consumption_flock_id on public.water_consumption(flock_id);
