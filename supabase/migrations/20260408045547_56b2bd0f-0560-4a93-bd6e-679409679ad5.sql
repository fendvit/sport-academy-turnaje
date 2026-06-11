
-- Fix hash_tournament_password to find crypt/gen_salt
CREATE OR REPLACE FUNCTION public.hash_tournament_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password NOT LIKE '$2a$%' AND NEW.password NOT LIKE '$2b$%' THEN
    NEW.password := crypt(NEW.password, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Fix hash_scorer_pin to find crypt/gen_salt
CREATE OR REPLACE FUNCTION public.hash_scorer_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin NOT LIKE '$2a$%' AND NEW.pin NOT LIKE '$2b$%' THEN
    NEW.pin := crypt(NEW.pin, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
