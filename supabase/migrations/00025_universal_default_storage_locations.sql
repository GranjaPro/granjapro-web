-- ============================================
-- Migration 00024: Universal Default Storage Locations
-- ============================================

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
    (target_farm_id, 'Sem local definido - Embalagens', 'packaging', true)
  on conflict (farm_id, category, name) do update
    set is_default = true,
        status = 'active',
        updated_at = now();
end;
$$;

select public.ensure_default_storage_locations(id) from public.farms;
