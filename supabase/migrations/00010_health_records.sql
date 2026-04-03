-- Health Records table for vaccinations, treatments, and inspections
create table public.health_records (
  id uuid default extensions.uuid_generate_v4() primary key,
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
