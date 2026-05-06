-- ============================================
-- Migration 00012: Equipment Table
-- Tracks farm equipment with maintenance schedules and lifecycle data
-- ============================================

create table if not exists public.equipment (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms(id) on delete cascade not null,
  name text not null,
  location text,
  type text default 'geral' not null check (type in ('alimentacao', 'climatizacao', 'iluminacao', 'hidraulico', 'geral')),
  status text default 'operacional' not null check (status in ('operacional', 'manutencao', 'inativo')),
  brand text,
  model text,
  installation_date date,
  next_maintenance_date date,
  notes text,
  equipment_value numeric(12,2) default 0,
  usage_hours numeric(10,2) default 0,
  lifespan_hours numeric(10,2) default 0,
  installation_company text,
  support_contact text
);

-- Enable RLS
alter table public.equipment enable row level security;

-- RLS policies: users can only access equipment belonging to their farm
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'equipment' and policyname = 'Users can view own farm equipment') then
    create policy "Users can view own farm equipment" on public.equipment
      for select using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'equipment' and policyname = 'Users can insert own farm equipment') then
    create policy "Users can insert own farm equipment" on public.equipment
      for insert with check (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'equipment' and policyname = 'Users can update own farm equipment') then
    create policy "Users can update own farm equipment" on public.equipment
      for update using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'equipment' and policyname = 'Users can delete own farm equipment') then
    create policy "Users can delete own farm equipment" on public.equipment
      for delete using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

-- Auto-update updated_at
drop trigger if exists set_equipment_updated_at on public.equipment;
create trigger set_equipment_updated_at
  before update on public.equipment
  for each row execute procedure public.handle_updated_at();
