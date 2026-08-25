-- Delete inventory-owned records together so no orphaned history remains.
alter table public.feed_consumption
  drop constraint if exists feed_consumption_feed_inventory_id_fkey;

alter table public.feed_consumption
  add constraint feed_consumption_feed_inventory_id_fkey
  foreign key (feed_inventory_id)
  references public.feed_inventory(id)
  on delete cascade;

alter table public.financial_transactions
  drop constraint if exists financial_transactions_feed_inventory_id_fkey,
  drop constraint if exists financial_transactions_medicine_inventory_id_fkey,
  drop constraint if exists financial_transactions_packaging_inventory_id_fkey,
  drop constraint if exists financial_transactions_equipment_inventory_id_fkey;

alter table public.financial_transactions
  add constraint financial_transactions_feed_inventory_id_fkey
    foreign key (feed_inventory_id) references public.feed_inventory(id) on delete cascade,
  add constraint financial_transactions_medicine_inventory_id_fkey
    foreign key (medicine_inventory_id) references public.medicine_inventory(id) on delete cascade,
  add constraint financial_transactions_packaging_inventory_id_fkey
    foreign key (packaging_inventory_id) references public.packaging_inventory(id) on delete cascade,
  add constraint financial_transactions_equipment_inventory_id_fkey
    foreign key (equipment_inventory_id) references public.equipment_inventory(id) on delete cascade;

alter table public.inventory_losses
  drop constraint if exists inventory_losses_feed_inventory_id_fkey,
  drop constraint if exists inventory_losses_vaccine_inventory_id_fkey,
  drop constraint if exists inventory_losses_medicine_inventory_id_fkey,
  drop constraint if exists inventory_losses_packaging_inventory_id_fkey,
  drop constraint if exists inventory_losses_equipment_inventory_id_fkey;

alter table public.inventory_losses
  add constraint inventory_losses_feed_inventory_id_fkey
    foreign key (feed_inventory_id) references public.feed_inventory(id) on delete cascade,
  add constraint inventory_losses_medicine_inventory_id_fkey
    foreign key (medicine_inventory_id) references public.medicine_inventory(id) on delete cascade,
  add constraint inventory_losses_packaging_inventory_id_fkey
    foreign key (packaging_inventory_id) references public.packaging_inventory(id) on delete cascade,
  add constraint inventory_losses_equipment_inventory_id_fkey
    foreign key (equipment_inventory_id) references public.equipment_inventory(id) on delete cascade;

-- A custom location is removed only after its records are reassigned to the
-- platform default for the same farm and inventory category.
create or replace function public.safe_delete_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  default_location_id uuid;
begin
  if old.is_default then
    raise exception using
      errcode = 'P0001',
      message = 'O local padrão não pode ser excluído.';
  end if;

  select id
    into default_location_id
    from public.storage_locations
   where farm_id = old.farm_id
     and category = old.category
     and is_default = true
     and id <> old.id
   limit 1;

  if default_location_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'O local padrão "Sem local definido" não foi encontrado para esta categoria.';
  end if;

  if old.category = 'feed' then
    update public.feed_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'medicine' then
    update public.medicine_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'packaging' then
    update public.packaging_inventory
       set location_id = default_location_id
     where location_id = old.id;
  elsif old.category = 'equipment' then
    update public.equipment_inventory
       set location_id = default_location_id
     where location_id = old.id;
  end if;

  update public.inventory_losses
     set location_id = default_location_id
   where location_id = old.id;

  return old;
end;
$$;
