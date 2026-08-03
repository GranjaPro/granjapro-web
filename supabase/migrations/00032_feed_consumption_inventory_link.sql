alter table public.feed_consumption
  add column if not exists feed_inventory_id uuid references public.feed_inventory(id) on delete restrict;

drop trigger if exists sync_feed_inventory_purchase_expense on public.feed_inventory;

alter table public.feed_inventory
  alter column unit_cost type numeric(14,6);

create trigger sync_feed_inventory_purchase_expense
  after insert or update of quantity, unit_cost, total_cost, entry_date, name, feed_category, feed_type
  on public.feed_inventory
  for each row execute procedure public.sync_inventory_purchase_expense('feed', 'inventory:feed');

create index if not exists idx_feed_consumption_inventory
  on public.feed_consumption(feed_inventory_id);

create or replace function public.create_feed_consumption_with_stock(
  p_farm_id uuid,
  p_date date,
  p_barn_id uuid,
  p_flock_id uuid,
  p_feed_inventory_id uuid,
  p_quantity_kg numeric
)
returns public.feed_consumption
language plpgsql
set search_path = public
as $$
declare
  inventory_record public.feed_inventory%rowtype;
  consumed_inventory_units numeric;
  consumption_cost numeric;
  created_record public.feed_consumption%rowtype;
begin
  if p_quantity_kg <= 0 then
    raise exception 'O consumo deve ser maior que zero.';
  end if;

  select * into inventory_record
    from public.feed_inventory
   where id = p_feed_inventory_id
     and farm_id = p_farm_id
   for update;

  if not found then
    raise exception 'Item de estoque de ração não encontrado.';
  end if;
  if lower(inventory_record.unit) not in ('kg', 'g') then
    raise exception 'A unidade do item deve ser kg ou g.';
  end if;
  if coalesce(inventory_record.unit_cost, 0) <= 0 then
    raise exception 'Cadastre o custo unitário da ração antes de registrar o consumo.';
  end if;

  consumed_inventory_units := case
    when lower(inventory_record.unit) = 'g' then p_quantity_kg * 1000
    else p_quantity_kg
  end;

  if inventory_record.quantity < consumed_inventory_units then
    raise exception 'Estoque insuficiente para registrar este consumo.';
  end if;

  consumption_cost := round(consumed_inventory_units * inventory_record.unit_cost, 2);

  update public.feed_inventory
     set quantity = quantity - consumed_inventory_units
   where id = inventory_record.id;

  insert into public.feed_consumption (
    farm_id, date, barn_id, flock_id, feed_inventory_id,
    quantity_kg, cost, feed_type
  ) values (
    p_farm_id, p_date, p_barn_id, p_flock_id, p_feed_inventory_id,
    p_quantity_kg, consumption_cost, coalesce(inventory_record.feed_type, inventory_record.name)
  )
  returning * into created_record;

  return created_record;
end;
$$;

create or replace function public.update_feed_consumption_with_stock(
  p_record_id uuid,
  p_date date,
  p_barn_id uuid,
  p_flock_id uuid,
  p_feed_inventory_id uuid,
  p_quantity_kg numeric
)
returns public.feed_consumption
language plpgsql
set search_path = public
as $$
declare
  consumption_record public.feed_consumption%rowtype;
  old_inventory_record public.feed_inventory%rowtype;
  new_inventory_record public.feed_inventory%rowtype;
  old_inventory_units numeric;
  new_inventory_units numeric;
  consumption_cost numeric;
  updated_record public.feed_consumption%rowtype;
begin
  if p_quantity_kg <= 0 then
    raise exception 'O consumo deve ser maior que zero.';
  end if;

  select * into consumption_record
    from public.feed_consumption
   where id = p_record_id
   for update;

  if not found then
    raise exception 'Registro de consumo não encontrado.';
  end if;

  if consumption_record.feed_inventory_id is not null then
    select * into old_inventory_record
      from public.feed_inventory
     where id = consumption_record.feed_inventory_id
     for update;

    old_inventory_units := case
      when lower(old_inventory_record.unit) = 'g' then consumption_record.quantity_kg * 1000
      else consumption_record.quantity_kg
    end;

    update public.feed_inventory
       set quantity = quantity + old_inventory_units
     where id = old_inventory_record.id;
  end if;

  select * into new_inventory_record
    from public.feed_inventory
   where id = p_feed_inventory_id
     and farm_id = consumption_record.farm_id
   for update;

  if not found then
    raise exception 'Item de estoque de ração não encontrado.';
  end if;
  if lower(new_inventory_record.unit) not in ('kg', 'g') then
    raise exception 'A unidade do item deve ser kg ou g.';
  end if;
  if coalesce(new_inventory_record.unit_cost, 0) <= 0 then
    raise exception 'Cadastre o custo unitário da ração antes de registrar o consumo.';
  end if;

  new_inventory_units := case
    when lower(new_inventory_record.unit) = 'g' then p_quantity_kg * 1000
    else p_quantity_kg
  end;

  if new_inventory_record.quantity < new_inventory_units then
    raise exception 'Estoque insuficiente para registrar este consumo.';
  end if;

  consumption_cost := round(new_inventory_units * new_inventory_record.unit_cost, 2);

  update public.feed_inventory
     set quantity = quantity - new_inventory_units
   where id = new_inventory_record.id;

  update public.feed_consumption
     set date = p_date,
         barn_id = p_barn_id,
         flock_id = p_flock_id,
         feed_inventory_id = p_feed_inventory_id,
         quantity_kg = p_quantity_kg,
         cost = consumption_cost,
         feed_type = coalesce(new_inventory_record.feed_type, new_inventory_record.name)
   where id = p_record_id
  returning * into updated_record;

  return updated_record;
end;
$$;

create or replace function public.delete_feed_consumption_with_stock(p_record_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  consumption_record public.feed_consumption%rowtype;
  inventory_record public.feed_inventory%rowtype;
  restored_inventory_units numeric;
begin
  select * into consumption_record
    from public.feed_consumption
   where id = p_record_id
   for update;

  if not found then
    raise exception 'Registro de consumo não encontrado.';
  end if;

  if consumption_record.feed_inventory_id is not null then
    select * into inventory_record
      from public.feed_inventory
     where id = consumption_record.feed_inventory_id
     for update;

    restored_inventory_units := case
      when lower(inventory_record.unit) = 'g' then consumption_record.quantity_kg * 1000
      else consumption_record.quantity_kg
    end;

    update public.feed_inventory
       set quantity = quantity + restored_inventory_units
     where id = inventory_record.id;
  end if;

  delete from public.feed_consumption where id = p_record_id;
end;
$$;

revoke all on function public.create_feed_consumption_with_stock(uuid, date, uuid, uuid, uuid, numeric) from public;
revoke all on function public.update_feed_consumption_with_stock(uuid, date, uuid, uuid, uuid, numeric) from public;
revoke all on function public.delete_feed_consumption_with_stock(uuid) from public;
grant execute on function public.create_feed_consumption_with_stock(uuid, date, uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.update_feed_consumption_with_stock(uuid, date, uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.delete_feed_consumption_with_stock(uuid) to authenticated;
