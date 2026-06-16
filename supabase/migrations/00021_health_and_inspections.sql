-- Phase 15: sanitary traceability, daily inspections, and mortality categorization.

create table if not exists public.daily_inspections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  flock_id uuid references public.flocks(id) on delete cascade,
  date date not null,
  responsible text,
  feces_aspect text not null default 'Normal' check (feces_aspect in ('Normal', 'Diarrhea', 'Blood')),
  respiratory_symptoms text not null default 'None' check (respiratory_symptoms in ('None', 'Snick', 'Coryza')),
  behavior text not null default 'Normal' check (behavior in ('Normal', 'Huddled', 'Feather Pecking')),
  light_timer_ops boolean not null default true,
  water_chlorine_ppm numeric,
  water_ph numeric,
  notes text
);

alter table public.daily_inspections enable row level security;

create policy "Users can view daily inspections from owned farms"
  on public.daily_inspections for select
  using (
    exists (
      select 1 from public.farms
      where farms.id = daily_inspections.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create policy "Users can insert daily inspections from owned farms"
  on public.daily_inspections for insert
  with check (
    exists (
      select 1 from public.farms
      where farms.id = daily_inspections.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create policy "Users can update daily inspections from owned farms"
  on public.daily_inspections for update
  using (
    exists (
      select 1 from public.farms
      where farms.id = daily_inspections.farm_id
        and farms.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farms
      where farms.id = daily_inspections.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create policy "Users can delete daily inspections from owned farms"
  on public.daily_inspections for delete
  using (
    exists (
      select 1 from public.farms
      where farms.id = daily_inspections.farm_id
        and farms.owner_id = auth.uid()
    )
  );

alter table public.health_records
  add column if not exists target_disease text,
  add column if not exists brand_name text,
  add column if not exists batch text,
  add column if not exists expiry_date date,
  add column if not exists manufacturer text,
  add column if not exists application_route text check (
    application_route is null or application_route in (
      'water',
      'ocular',
      'spray',
      'wing web',
      'intramuscular',
      'subcutaneous'
    )
  ),
  add column if not exists doses int,
  add column if not exists active_ingredient text,
  add column if not exists dosage_dilution text,
  add column if not exists withdrawal_period_days int,
  add column if not exists disposal_destination text,
  add column if not exists prescription_ref text;

alter table public.mortality
  add column if not exists mortality_type text not null default 'natural'
    check (mortality_type in ('natural', 'culling'));
