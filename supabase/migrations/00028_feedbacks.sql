-- ============================================
-- Migration 00028: Add feedbacks table
-- ============================================

create table if not exists public.feedbacks (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  category text not null check (category in ('Satisfacao', 'Bug', 'Sugestao', 'Dificuldade', 'Outro')),
  description text
);

alter table public.feedbacks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'feedbacks' and policyname = 'Users can insert feedback for their farm') then
    create policy "Users can insert feedback for their farm" on public.feedbacks for insert
      to authenticated
      with check (
        user_id = auth.uid()
        and exists (
          select 1
          from public.farms
          where farms.id = feedbacks.farm_id
            and (
              farms.owner_id = auth.uid()
              or farms.id in (select profiles.farm_id from public.profiles where profiles.id = auth.uid())
            )
        )
      );
  end if;
end $$;

create index if not exists idx_feedbacks_farm_created_at on public.feedbacks(farm_id, created_at desc);
create index if not exists idx_feedbacks_user_id on public.feedbacks(user_id);
