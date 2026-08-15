-- Follows remote-only migrations 00028 and 00029.
create table if not exists public.kpi_goals (
  farm_id uuid references public.farms on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  dashboard_daily_eggs_goal numeric,
  dashboard_laying_rate_goal numeric,
  dashboard_cost_per_egg_goal numeric,
  dashboard_daily_profit_goal numeric,
  feed_min_stock_kg numeric,
  feed_min_coverage_days numeric,
  monthly_mortality_rate numeric,
  weekly_mortality_count numeric,
  accumulated_mortality_count numeric,
  monthly_revenue_goal numeric
);
alter table public.kpi_goals enable row level security;
do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kpi_goals'
      and policyname = 'Users can view KPI goals of their farm'
  ) then
    create policy "Users can view KPI goals of their farm"
      on public.kpi_goals
      for select
      to authenticated
      using (
        farm_id in (
          select id from public.farms where owner_id = auth.uid()
          union
          select farm_id from public.profiles where id = auth.uid()
        )
      );
  end if;
end $$;
do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kpi_goals'
      and policyname = 'Users can insert KPI goals in their farm'
  ) then
    create policy "Users can insert KPI goals in their farm"
      on public.kpi_goals
      for insert
      to authenticated
      with check (
        farm_id in (
          select id from public.farms where owner_id = auth.uid()
          union
          select farm_id from public.profiles where id = auth.uid()
        )
      );
  end if;
end $$;
do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kpi_goals'
      and policyname = 'Users can update KPI goals in their farm'
  ) then
    create policy "Users can update KPI goals in their farm"
      on public.kpi_goals
      for update
      to authenticated
      using (
        farm_id in (
          select id from public.farms where owner_id = auth.uid()
          union
          select farm_id from public.profiles where id = auth.uid()
        )
      )
      with check (
        farm_id in (
          select id from public.farms where owner_id = auth.uid()
          union
          select farm_id from public.profiles where id = auth.uid()
        )
      );
  end if;
end $$;
drop trigger if exists set_updated_at on public.kpi_goals;
create trigger set_updated_at
  before update on public.kpi_goals
  for each row execute procedure public.handle_updated_at();
alter table public.egg_production
  add column if not exists deformed_eggs int default 0,
  add column if not exists internal_abnormality_eggs int default 0;