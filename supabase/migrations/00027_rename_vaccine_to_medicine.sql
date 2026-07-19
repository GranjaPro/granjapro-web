-- ============================================
-- Migration 00026: Rename Vaccine to Medicine
-- ============================================

-- Rename table
ALTER TABLE public.vaccine_inventory RENAME TO medicine_inventory;

-- Rename indexes
ALTER INDEX IF EXISTS idx_vaccine_inventory_farm_location RENAME TO idx_medicine_inventory_farm_location;
ALTER INDEX IF EXISTS idx_vaccine_inventory_farm_entry_date RENAME TO idx_medicine_inventory_farm_entry_date;

-- Update storage_locations check constraint
ALTER TABLE public.storage_locations DROP CONSTRAINT IF EXISTS storage_locations_category_check;
UPDATE public.storage_locations SET category = 'medicine' WHERE category = 'vaccine';
ALTER TABLE public.storage_locations ADD CONSTRAINT storage_locations_category_check CHECK (category IN ('feed', 'medicine', 'packaging', 'equipment'));

-- Update inventory_losses check constraint
ALTER TABLE public.inventory_losses DROP CONSTRAINT IF EXISTS inventory_losses_inventory_type_check;
ALTER TABLE public.inventory_losses DROP CONSTRAINT IF EXISTS inventory_losses_check;

UPDATE public.inventory_losses SET inventory_type = 'medicine' WHERE inventory_type = 'vaccine';
ALTER TABLE public.inventory_losses RENAME COLUMN vaccine_inventory_id TO medicine_inventory_id;

ALTER TABLE public.inventory_losses ADD CONSTRAINT inventory_losses_inventory_type_check CHECK (inventory_type IN ('feed', 'medicine', 'packaging', 'equipment'));
ALTER TABLE public.inventory_losses ADD CONSTRAINT inventory_losses_check CHECK (
    (inventory_type = 'feed' AND feed_inventory_id IS NOT NULL AND medicine_inventory_id IS NULL AND packaging_inventory_id IS NULL AND equipment_inventory_id IS NULL)
    OR (inventory_type = 'medicine' AND medicine_inventory_id IS NOT NULL AND feed_inventory_id IS NULL AND packaging_inventory_id IS NULL AND equipment_inventory_id IS NULL)
    OR (inventory_type = 'packaging' AND packaging_inventory_id IS NOT NULL AND feed_inventory_id IS NULL AND medicine_inventory_id IS NULL AND equipment_inventory_id IS NULL)
    OR (inventory_type = 'equipment' AND equipment_inventory_id IS NOT NULL AND feed_inventory_id IS NULL AND medicine_inventory_id IS NULL AND packaging_inventory_id IS NULL)
);

-- Update RLS policies
ALTER POLICY "Users can view vaccine inventory of their farm" ON public.medicine_inventory RENAME TO "Users can view medicine inventory of their farm";
ALTER POLICY "Users can insert vaccine inventory in their farm" ON public.medicine_inventory RENAME TO "Users can insert medicine inventory in their farm";
ALTER POLICY "Users can update vaccine inventory in their farm" ON public.medicine_inventory RENAME TO "Users can update medicine inventory in their farm";
ALTER POLICY "Users can delete vaccine inventory in their farm" ON public.medicine_inventory RENAME TO "Users can delete medicine inventory in their farm";

-- Update Triggers
ALTER TRIGGER sync_vaccine_inventory_purchase_expense ON public.medicine_inventory RENAME TO sync_medicine_inventory_purchase_expense;

DROP TRIGGER IF EXISTS sync_medicine_inventory_purchase_expense ON public.medicine_inventory;
CREATE TRIGGER sync_medicine_inventory_purchase_expense
  AFTER INSERT OR UPDATE OF quantity, unit_cost, total_cost, entry_date, name, target_disease, manufacturer
  ON public.medicine_inventory
  FOR EACH ROW EXECUTE PROCEDURE public.sync_inventory_purchase_expense('medicines', 'inventory:medicine');

-- Recreate ensure_default_storage_locations to use 'medicine'
CREATE OR REPLACE FUNCTION public.ensure_default_storage_locations(target_farm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  UPDATE public.storage_locations
     SET is_default = false,
         updated_at = now()
   WHERE farm_id = target_farm_id
     AND category IN ('feed', 'medicine')
     AND name IN ('Sem local definido - Racao', 'Sem local definido - Vacinas', 'Sem local definido - Medicamentos');

  INSERT INTO public.storage_locations (farm_id, name, category, is_default)
  VALUES
    (target_farm_id, 'Sem local definido', 'feed', true),
    (target_farm_id, 'Sem local definido', 'medicine', true),
    (target_farm_id, 'Sem local definido - Embalagens', 'packaging', true),
    (target_farm_id, 'Sem local definido', 'equipment', true)
  ON CONFLICT (farm_id, category, name) DO UPDATE
    SET is_default = true,
        status = 'active',
        updated_at = now();
END;
$$;

-- Update apply_inventory_loss
CREATE OR REPLACE FUNCTION public.apply_inventory_loss()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item_farm_id uuid;
  item_location_id uuid;
BEGIN
  IF NEW.inventory_type = 'feed' THEN
    SELECT farm_id, location_id INTO item_farm_id, item_location_id FROM public.feed_inventory WHERE id = NEW.feed_inventory_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Feed inventory item not found'; END IF;
    UPDATE public.feed_inventory SET quantity = quantity - NEW.quantity WHERE id = NEW.feed_inventory_id AND quantity >= NEW.quantity;
  ELSIF NEW.inventory_type = 'medicine' THEN
    SELECT farm_id, location_id INTO item_farm_id, item_location_id FROM public.medicine_inventory WHERE id = NEW.medicine_inventory_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Medicine inventory item not found'; END IF;
    UPDATE public.medicine_inventory SET quantity = quantity - NEW.quantity WHERE id = NEW.medicine_inventory_id AND quantity >= NEW.quantity;
  ELSIF NEW.inventory_type = 'packaging' THEN
    SELECT farm_id, location_id INTO item_farm_id, item_location_id FROM public.packaging_inventory WHERE id = NEW.packaging_inventory_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Packaging inventory item not found'; END IF;
    UPDATE public.packaging_inventory SET quantity = quantity - NEW.quantity WHERE id = NEW.packaging_inventory_id AND quantity >= NEW.quantity;
  ELSIF NEW.inventory_type = 'equipment' THEN
    SELECT farm_id, location_id INTO item_farm_id, item_location_id FROM public.equipment_inventory WHERE id = NEW.equipment_inventory_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Equipment inventory item not found'; END IF;
    UPDATE public.equipment_inventory SET quantity = quantity - NEW.quantity WHERE id = NEW.equipment_inventory_id AND quantity >= NEW.quantity;
  END IF;

  IF item_farm_id <> NEW.farm_id OR item_location_id <> NEW.location_id THEN
    RAISE EXCEPTION 'Inventory loss farm or location mismatch';
  END IF;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient inventory quantity for loss'; END IF;

  RETURN NEW;
END;
$$;

-- Update safe_delete_storage_location
CREATE OR REPLACE FUNCTION public.safe_delete_storage_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.feed_inventory WHERE location_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.medicine_inventory WHERE location_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.packaging_inventory WHERE location_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.equipment_inventory WHERE location_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.inventory_losses WHERE location_id = OLD.id) THEN
    UPDATE public.storage_locations
       SET status = 'inactive',
           updated_at = now()
     WHERE id = OLD.id;
    RETURN NULL;
  END IF;

  RETURN OLD;
END;
$$;
