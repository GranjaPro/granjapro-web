-- ============================================
-- Migration 00009: Add Feed Inventory table
-- Based on Section 15 of schema.sql
-- ============================================

-- Create feed_inventory table
create table if not exists public.feed_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  category text default 'Ração' check (category in ('Ração', 'Insumo', 'Suplemento', 'Mineral')),
  quantity numeric(10,2) not null,
  unit text default 'kg' check (unit in ('kg', 'g', 'L', 'un')),
  status text default 'normal' check (status in ('normal', 'alerta', 'baixo')),
  supplier text,
  location text,
  lot_number text,
  arrival_date date
);

-- Enable RLS
alter table public.feed_inventory enable row level security;

-- Policies
create policy "Users can view inventory of their farm" 
  on public.feed_inventory for select 
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid() 
    union 
    select farm_id from public.profiles where id = auth.uid()
  ));

create policy "Users can insert inventory in their farm" 
  on public.feed_inventory for insert 
  with check (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can update inventory in their farm" 
  on public.feed_inventory for update 
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

create policy "Users can delete inventory in their farm" 
  on public.feed_inventory for delete 
  using (farm_id in (
    select id from public.farms where owner_id = auth.uid()
  ));

-- Update trigger for updated_at
create trigger set_updated_at 
  before update on public.feed_inventory 
  for each row execute procedure public.handle_updated_at();
