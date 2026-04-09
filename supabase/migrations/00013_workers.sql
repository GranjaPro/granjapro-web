-- ============================================
-- Migration 00013: Workers Table
-- Tracks farm workers with roles, status, and contact info
-- ============================================

create table if not exists public.workers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms(id) on delete cascade not null,
  name text not null,
  role text default 'tratador' not null check (role in ('gerente', 'tratador', 'coletor', 'motorista', 'manutencao', 'administrativo')),
  status text default 'ativo' not null check (status in ('ativo', 'ferias', 'afastado', 'desligado')),
  phone text,
  email text,
  location text,
  hiring_date date,
  salary numeric(12,2) default 0,
  notes text
);

-- Enable RLS
alter table public.workers enable row level security;

-- RLS policies: users can only access workers belonging to their farm
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workers' and policyname = 'Users can view own farm workers') then
    create policy "Users can view own farm workers" on public.workers
      for select using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workers' and policyname = 'Users can insert own farm workers') then
    create policy "Users can insert own farm workers" on public.workers
      for insert with check (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workers' and policyname = 'Users can update own farm workers') then
    create policy "Users can update own farm workers" on public.workers
      for update using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'workers' and policyname = 'Users can delete own farm workers') then
    create policy "Users can delete own farm workers" on public.workers
      for delete using (
        farm_id in (select farm_id from public.profiles where id = auth.uid())
      );
  end if;
end $$;

-- Auto-update updated_at
create trigger set_workers_updated_at
  before update on public.workers
  for each row execute procedure public.set_updated_at();
