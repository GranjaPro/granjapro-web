-- ============================================
-- Migration 00023: Storage Locations and Specialized Inventory
-- ============================================

create table if not exists public.storage_locations (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  name text not null,
  category text not null check (category in ('feed', 'vaccine', 'packaging')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_default boolean not null default false,
  notes text,
  unique (farm_id, category, name)
);

create or replace function public.ensure_default_storage_locations(target_farm_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.storage_locations (farm_id, name, category, is_default)
  values
    (target_farm_id, 'Sem local definido - Racao', 'feed', true),
    (target_farm_id, 'Sem local definido - Vacinas', 'vaccine', true),
    (target_farm_id, 'Sem local definido - Embalagens', 'packaging', true)
  on conflict (farm_id, category, name) do update
    set is_default = true,
        status = 'active',
        updated_at = now();
end;
$$;

create or replace function public.ensure_default_storage_locations_for_new_farm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_storage_locations(new.id);
  return new;
end;
$$;

select public.ensure_default_storage_locations(id) from public.farms;

drop trigger if exists ensure_default_storage_locations_after_farm_insert on public.farms;
create trigger ensure_default_storage_locations_after_farm_insert
  after insert on public.farms
  for each row execute procedure public.ensure_default_storage_locations_for_new_farm();

create table if not exists public.feed_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  feed_category text,
  feed_type text,
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'kg',
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

create table if not exists public.vaccine_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  target_disease text,
  manufacturer text,
  doses integer check (doses is null or doses >= 0),
  application_route text check (application_route is null or application_route in ('oral', 'ocular', 'nasal', 'injectable', 'spray', 'water', 'other')),
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'doses',
  status text not null default 'normal' check (status in ('normal', 'alerta', 'baixo')),
  supplier text,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  entry_date date not null default current_date,
  lot_number text,
  minimum_quantity numeric(10,2) not null default 0,
  expiration_date date not null,
  notes text
);

create table if not exists public.packaging_inventory (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  name text not null,
  package_type text,
  size text,
  material text,
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

create or replace function public.validate_inventory_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_category text := tg_argv[0];
  location_record public.storage_locations%rowtype;
begin
  select *
    into location_record
    from public.storage_locations
   where id = new.location_id;

  if not found then
    raise exception 'Storage location % does not exist', new.location_id;
  end if;

  if location_record.farm_id <> new.farm_id then
    raise exception 'Storage location farm mismatch';
  end if;

  if location_record.status <> 'active' then
    raise exception 'Storage location is inactive';
  end if;

  if location_record.category <> expected_category then
    raise exception 'Storage location category % does not match %', location_record.category, expected_category;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_feed_inventory_location on public.feed_inventory;
create trigger validate_feed_inventory_location
  before insert or update of farm_id, location_id on public.feed_inventory
  for each row execute procedure public.validate_inventory_storage_location('feed');

drop trigger if exists validate_vaccine_inventory_location on public.vaccine_inventory;
create trigger validate_vaccine_inventory_location
  before insert or update of farm_id, location_id on public.vaccine_inventory
  for each row execute procedure public.validate_inventory_storage_location('vaccine');

drop trigger if exists validate_packaging_inventory_location on public.packaging_inventory;
create trigger validate_packaging_inventory_location
  before insert or update of farm_id, location_id on public.packaging_inventory
  for each row execute procedure public.validate_inventory_storage_location('packaging');

insert into public.feed_inventory (
  farm_id,
  location_id,
  name,
  feed_category,
  feed_type,
  quantity,
  unit,
  status,
  supplier,
  total_cost,
  entry_date,
  lot_number,
  expiration_date,
  notes
)
select
  inventory.farm_id,
  storage_locations.id,
  inventory.name,
  inventory.type,
  inventory.type,
  inventory.quantity,
  coalesce(inventory.unit, 'kg'),
  case
    when inventory.status in ('normal', 'alerta', 'baixo') then inventory.status
    else 'normal'
  end,
  inventory.supplier,
  nullif(inventory.inventory_value, 0),
  coalesce(inventory.arrival_date, current_date),
  inventory.lot_number,
  inventory.expiration_date,
  inventory.notes
from public.inventory
join public.storage_locations
  on storage_locations.farm_id = inventory.farm_id
 and storage_locations.category = 'feed'
 and storage_locations.is_default = true
where not exists (
  select 1
    from public.feed_inventory existing
   where existing.farm_id = inventory.farm_id
     and existing.name = inventory.name
     and existing.lot_number is not distinct from inventory.lot_number
);

do $$
begin
  if exists (
    select 1
      from public.financial_transactions
     where reference is not null
     group by reference
    having count(*) > 1
  ) then
    raise exception 'Duplicate financial transaction references must be resolved before creating the inventory reference index';
  end if;
end;
$$;

create unique index if not exists idx_financial_transactions_reference_unique
  on public.financial_transactions(reference)
  where reference is not null;

create or replace function public.sync_inventory_purchase_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_category text := tg_argv[0];
  reference_prefix text := tg_argv[1];
  inventory_reference text;
  generated_amount numeric(12,2);
  inventory_description text;
begin
  inventory_reference := reference_prefix || ':' || new.id::text;
  generated_amount := coalesce(nullif(new.total_cost, 0), new.quantity * coalesce(new.unit_cost, 0));

  if generated_amount is null or generated_amount <= 0 then
    delete from public.financial_transactions
     where reference = inventory_reference;
    return new;
  end if;

  inventory_description := 'Compra de estoque: ' || new.name;

  insert into public.financial_transactions (
    farm_id,
    date,
    type,
    category,
    description,
    amount,
    reference
  )
  values (
    new.farm_id,
    new.entry_date,
    'expense',
    expense_category,
    inventory_description,
    generated_amount,
    inventory_reference
  )
  on conflict (reference) where reference is not null do update
    set farm_id = excluded.farm_id,
        date = excluded.date,
        type = excluded.type,
        category = excluded.category,
        description = excluded.description,
        amount = excluded.amount;

  return new;
end;
$$;

drop trigger if exists sync_feed_inventory_purchase_expense on public.feed_inventory;
create trigger sync_feed_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, feed_category, feed_type
  on public.feed_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('feed', 'inventory:feed');

drop trigger if exists sync_vaccine_inventory_purchase_expense on public.vaccine_inventory;
create trigger sync_vaccine_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, target_disease, manufacturer
  on public.vaccine_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('medicines', 'inventory:vaccine');

drop trigger if exists sync_packaging_inventory_purchase_expense on public.packaging_inventory;
create trigger sync_packaging_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, package_type, size, material
  on public.packaging_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('other', 'inventory:packaging');

create table if not exists public.inventory_losses (
  id uuid default extensions.uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  farm_id uuid references public.farms on delete cascade not null,
  location_id uuid references public.storage_locations on delete restrict not null,
  inventory_type text not null check (inventory_type in ('feed', 'vaccine', 'packaging')),
  feed_inventory_id uuid references public.feed_inventory on delete restrict,
  vaccine_inventory_id uuid references public.vaccine_inventory on delete restrict,
  packaging_inventory_id uuid references public.packaging_inventory on delete restrict,
  reason text not null check (reason in ('expiration', 'damage', 'contamination', 'humidity', 'sanitary_disposal', 'manual_adjustment', 'other')),
  quantity numeric(10,2) not null check (quantity > 0),
  loss_date date not null default current_date,
  notes text,
  check (
    (inventory_type = 'feed' and feed_inventory_id is not null and vaccine_inventory_id is null and packaging_inventory_id is null)
    or (inventory_type = 'vaccine' and vaccine_inventory_id is not null and feed_inventory_id is null and packaging_inventory_id is null)
    or (inventory_type = 'packaging' and packaging_inventory_id is not null and feed_inventory_id is null and vaccine_inventory_id is null)
  )
);

create or replace function public.apply_inventory_loss()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item_farm_id uuid;
  item_location_id uuid;
begin
  if new.inventory_type = 'feed' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.feed_inventory
     where id = new.feed_inventory_id
     for update;

    if not found then
      raise exception 'Feed inventory item not found';
    end if;

    update public.feed_inventory
       set quantity = quantity - new.quantity
     where id = new.feed_inventory_id
       and quantity >= new.quantity;
  elsif new.inventory_type = 'vaccine' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.vaccine_inventory
     where id = new.vaccine_inventory_id
     for update;

    if not found then
      raise exception 'Vaccine inventory item not found';
    end if;

    update public.vaccine_inventory
       set quantity = quantity - new.quantity
     where id = new.vaccine_inventory_id
       and quantity >= new.quantity;
  elsif new.inventory_type = 'packaging' then
    select farm_id, location_id
      into item_farm_id, item_location_id
      from public.packaging_inventory
     where id = new.packaging_inventory_id
     for update;

    if not found then
      raise exception 'Packaging inventory item not found';
    end if;

    update public.packaging_inventory
       set quantity = quantity - new.quantity
     where id = new.packaging_inventory_id
       and quantity >= new.quantity;
  end if;

  if item_farm_id <> new.farm_id or item_location_id <> new.location_id then
    raise exception 'Inventory loss farm or location mismatch';
  end if;

  if not found then
    raise exception 'Insufficient inventory quantity for loss';
  end if;

  return new;
end;
$$;

drop trigger if exists apply_inventory_loss_before_insert on public.inventory_losses;
create trigger apply_inventory_loss_before_insert
  before insert on public.inventory_losses
  for each row execute procedure public.apply_inventory_loss();

create or replace function public.safe_delete_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from public.feed_inventory where location_id = old.id)
    or exists (select 1 from public.vaccine_inventory where location_id = old.id)
    or exists (select 1 from public.packaging_inventory where location_id = old.id)
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

drop trigger if exists safe_delete_storage_location_before_delete on public.storage_locations;
create trigger safe_delete_storage_location_before_delete
  before delete on public.storage_locations
  for each row execute procedure public.safe_delete_storage_location();

alter table public.storage_locations enable row level security;
alter table public.feed_inventory enable row level security;
alter table public.vaccine_inventory enable row level security;
alter table public.packaging_inventory enable row level security;
alter table public.inventory_losses enable row level security;

create policy "Users can view storage locations of their farm" on public.storage_locations for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert storage locations in their farm" on public.storage_locations for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update storage locations in their farm" on public.storage_locations for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete storage locations in their farm" on public.storage_locations for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view feed inventory of their farm" on public.feed_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert feed inventory in their farm" on public.feed_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update feed inventory in their farm" on public.feed_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete feed inventory in their farm" on public.feed_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view vaccine inventory of their farm" on public.vaccine_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert vaccine inventory in their farm" on public.vaccine_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update vaccine inventory in their farm" on public.vaccine_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete vaccine inventory in their farm" on public.vaccine_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view packaging inventory of their farm" on public.packaging_inventory for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert packaging inventory in their farm" on public.packaging_inventory for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update packaging inventory in their farm" on public.packaging_inventory for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete packaging inventory in their farm" on public.packaging_inventory for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create policy "Users can view inventory losses of their farm" on public.inventory_losses for select using (farm_id in (select id from public.farms where owner_id = auth.uid() union select farm_id from public.profiles where id = auth.uid()));
create policy "Users can insert inventory losses in their farm" on public.inventory_losses for insert with check (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can update inventory losses in their farm" on public.inventory_losses for update using (farm_id in (select id from public.farms where owner_id = auth.uid()));
create policy "Users can delete inventory losses in their farm" on public.inventory_losses for delete using (farm_id in (select id from public.farms where owner_id = auth.uid()));

create trigger set_updated_at before update on public.storage_locations for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.feed_inventory for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.vaccine_inventory for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.packaging_inventory for each row execute procedure public.handle_updated_at();

create index if not exists idx_storage_locations_farm_category on public.storage_locations(farm_id, category);
create index if not exists idx_feed_inventory_farm_location on public.feed_inventory(farm_id, location_id);
create index if not exists idx_feed_inventory_farm_entry_date on public.feed_inventory(farm_id, entry_date);
create index if not exists idx_vaccine_inventory_farm_location on public.vaccine_inventory(farm_id, location_id);
create index if not exists idx_vaccine_inventory_farm_entry_date on public.vaccine_inventory(farm_id, entry_date);
create index if not exists idx_packaging_inventory_farm_location on public.packaging_inventory(farm_id, location_id);
create index if not exists idx_packaging_inventory_farm_entry_date on public.packaging_inventory(farm_id, entry_date);
create index if not exists idx_inventory_losses_farm_date on public.inventory_losses(farm_id, loss_date);
create index if not exists idx_inventory_losses_location on public.inventory_losses(location_id);
