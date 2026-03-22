-- Fix search_path security warnings for all functions

ALTER FUNCTION public.sync_barn_birds() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Drop increment_barn_birds if it still exists (replaced by trigger)
DROP FUNCTION IF EXISTS public.increment_barn_birds(uuid, int);
