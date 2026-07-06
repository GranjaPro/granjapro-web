-- ============================================
-- Migration 00025: Equipment Inventory
-- ============================================

-- Add equipment to storage locations categories
alter table public.storage_locations drop constraint if exists storage_locations_category_check;
alter table public.storage_locations add constraint storage_locations_category_check check (category in ('feed', 'vaccine', 'packaging', 'equipment'));

-- Update default locations function
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
    (target_farm_id, 'Sem local definido - Embalagens', 'packaging', true),
    (target_farm_id, 'Sem local definido', 'equipment', true)
  on conflict (farm_id, category, name) do update
    set is_default = true,
        status = 'active',
        updated_at = now();
end;
$$;

select public.ensure_default_storage_locations(id) from public.farms;

-- Create equipment inventory table
create table if not exists public.equipment_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  equipment_category text,
  equipment_type text,
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

-- Validation trigger for equipment
drop trigger if exists validate_equipment_inventory_location on public.equipment_inventory;
create trigger validate_equipment_inventory_location
  before insert or update of farm_id, location_id on public.equipment_inventory
  for each row execute procedure public.validate_inventory_storage_location('equipment');

-- Add equipment_inventory_id to inventory_losses
alter table public.inventory_losses drop constraint if exists inventory_losses_inventory_type_check;
alter table public.inventory_losses add constraint inventory_losses_inventory_type_check check (inventory_type in ('feed', 'vaccine', 'packaging', 'equipment'));

alter table public.inventory_losses add column if not exists equipment_inventory_id uuid references public.equipment_inventory on delete restrict;

alter table public.inventory_losses drop constraint if exists inventory_losses_check;
alter table public.inventory_losses add constraint inventory_losses_check check (
    (inventory_type = 'feed' and feed_inventory_id is not null and vaccine_inventory_id is null and packaging_inventory_id is null and equipment_inventory_id is null)
    or (inventory_type = 'vaccine' and vaccine_inventory_id is not null and feed_inventory_id is null and packaging_inventory_id is null and equipment_inventory_id is null)
    or (inventory_type = 'packaging' and packaging_inventory_id is not null and feed_inventory_id is null and vaccine_inventory_id is null and equipment_inventory_id is null)
    or (inventory_type = 'equipment' and equipment_inventory_id is not null and feed_inventory_id is null and vaccine_inventory_id is null and packaging_inventory_id is null)
);

-- RLS policies
alter table public.equipment_inventory enable row level security;
create policy "Users can view equipment inventory of their farm" on public.equipment_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert equipment inventory in their farm" on public.equipment_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update equipment inventory in their farm" on public.equipment_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete equipment inventory in their farm" on public.equipment_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create trigger set_updated_at before update on public.equipment_inventory for each row execute procedure public.handle_updated_at();

create index if not exists idx_equipment_inventory_farm_location on public.equipment_inventory(farm_id, location_id);
create index if not exists idx_equipment_inventory_farm_entry_date on public.equipment_inventory(farm_id, entry_date);

-- Update safe delete location
create or replace function public.safe_delete_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.feed_inventory where location_id = old.id)
    or exists (select 1 from public.vaccine_inventory where location_id = old.id)
    or exists (select 1 from public.packaging_inventory where location_id = old.id)
    or exists (select 1 from public.equipment_inventory where location_id = old.id)
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
