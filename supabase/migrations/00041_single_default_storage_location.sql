-- Preserve the most recently updated default in each farm/category
-- and demote existing duplicates without deleting any location.
with ranked_defaults as (
  select
    id,
    row_number() over (
      partition by farm_id, category
      order by updated_at desc, created_at desc, id desc
    ) as default_rank
  from public.storage_locations
  where is_default = true
)
update public.storage_locations
set
  is_default = false,
  updated_at = now()
where id in (
  select id
  from ranked_defaults
  where default_rank > 1
);

create or replace function public.enforce_single_default_storage_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_default then
    update public.storage_locations
       set is_default = false,
           updated_at = now()
     where farm_id = new.farm_id
       and category = new.category
       and id <> new.id
       and is_default = true;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_default_storage_location
  on public.storage_locations;

create trigger enforce_single_default_storage_location
  before insert or update of farm_id, category, is_default
  on public.storage_locations
  for each row
  execute procedure public.enforce_single_default_storage_location();

create unique index if not exists
  idx_storage_locations_single_default_per_category
  on public.storage_locations (farm_id, category)
  where is_default = true;
