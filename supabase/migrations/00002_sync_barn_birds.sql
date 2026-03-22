-- Trigger to auto-sync barns.current_birds when flocks change
CREATE OR REPLACE FUNCTION sync_barn_birds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.barn_id IS NOT NULL THEN
      UPDATE barns
      SET current_birds = GREATEST((
        SELECT COALESCE(SUM(bird_count), 0) FROM flocks WHERE barn_id = OLD.barn_id AND id != OLD.id
      ), 0),
      updated_at = now()
      WHERE id = OLD.barn_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.barn_id IS NOT NULL THEN
      UPDATE barns
      SET current_birds = (
        SELECT COALESCE(SUM(bird_count), 0) FROM flocks WHERE barn_id = NEW.barn_id
      ),
      updated_at = now()
      WHERE id = NEW.barn_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_barn_birds ON flocks;
CREATE TRIGGER trg_sync_barn_birds
AFTER INSERT OR UPDATE OR DELETE ON flocks
FOR EACH ROW EXECUTE FUNCTION sync_barn_birds();
