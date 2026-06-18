-- Phase 16: flock tasks CRUD with recurring task occurrences.

alter table public.tasks
  add column if not exists flock_id uuid references public.flocks(id) on delete cascade,
  add column if not exists category text not null default 'geral'
    check (category in ('coleta', 'alimentacao', 'limpeza', 'inspecao', 'saude', 'geral')),
  add column if not exists priority text not null default 'media'
    check (priority in ('alta', 'media', 'baixa')),
  add column if not exists recurrence text not null default 'unica'
    check (recurrence in ('diaria', 'semanal', 'mensal', 'unica')),
  add column if not exists notes text;

create table if not exists public.task_exceptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  occurrence_date date not null,
  status text not null check (status in ('done', 'missed', 'skipped')),
  completed_at timestamptz,
  notes text,
  unique (task_id, occurrence_date)
);

alter table public.task_exceptions enable row level security;

create policy "Users can view task exceptions from owned farms"
  on public.task_exceptions for select
  using (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and (
          farms.owner_id = auth.uid()
          or farms.id in (select profiles.farm_id from public.profiles where profiles.id = auth.uid())
        )
    )
  );

create policy "Users can insert task exceptions from owned farms"
  on public.task_exceptions for insert
  with check (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create policy "Users can update task exceptions from owned farms"
  on public.task_exceptions for update
  using (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and farms.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create policy "Users can delete task exceptions from owned farms"
  on public.task_exceptions for delete
  using (
    exists (
      select 1 from public.farms
      where farms.id = task_exceptions.farm_id
        and farms.owner_id = auth.uid()
    )
  );

create index if not exists idx_tasks_farm_flock_date
  on public.tasks(farm_id, flock_id, date);

create index if not exists idx_task_exceptions_farm_date
  on public.task_exceptions(farm_id, occurrence_date);

drop trigger if exists set_updated_at on public.task_exceptions;
create trigger set_updated_at before update on public.task_exceptions
  for each row execute procedure public.handle_updated_at();
