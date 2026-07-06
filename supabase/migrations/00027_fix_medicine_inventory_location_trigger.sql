-- ============================================
-- Migration 00027: Fix Medicine Inventory Location Trigger
-- ============================================

drop trigger if exists validate_vaccine_inventory_location on public.medicine_inventory;
drop trigger if exists validate_medicine_inventory_location on public.medicine_inventory;

create trigger validate_medicine_inventory_location
  before insert or update of farm_id, location_id on public.medicine_inventory
  for each row execute procedure public.validate_inventory_storage_location('medicine');
