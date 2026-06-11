
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash existing plaintext passwords
UPDATE tournaments SET password = crypt(password, gen_salt('bf', 10))
WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%';

-- Hash existing plaintext PINs
UPDATE scorers SET pin = crypt(pin, gen_salt('bf', 10))
WHERE pin NOT LIKE '$2a$%' AND pin NOT LIKE '$2b$%';

-- Create trigger function to auto-hash tournament passwords on insert/update
CREATE OR REPLACE FUNCTION public.hash_tournament_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password NOT LIKE '$2a$%' AND NEW.password NOT LIKE '$2b$%' THEN
    NEW.password := crypt(NEW.password, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER hash_password_before_upsert
  BEFORE INSERT OR UPDATE OF password ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_tournament_password();

-- Create trigger function to auto-hash scorer PINs on insert/update
CREATE OR REPLACE FUNCTION public.hash_scorer_pin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pin IS NOT NULL AND NEW.pin NOT LIKE '$2a$%' AND NEW.pin NOT LIKE '$2b$%' THEN
    NEW.pin := crypt(NEW.pin, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER hash_pin_before_upsert
  BEFORE INSERT OR UPDATE OF pin ON public.scorers
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_scorer_pin();

-- Revoke SELECT on password column from public roles
REVOKE SELECT (password) ON public.tournaments FROM anon, authenticated;

-- Grant SELECT on all non-sensitive columns
GRANT SELECT (id, name, date, created_at, phase, field_count, category, match_duration_minutes, break_duration_minutes, start_time) ON public.tournaments TO anon, authenticated;

-- Revoke SELECT on pin column from public roles
REVOKE SELECT (pin) ON public.scorers FROM anon, authenticated;

-- Grant SELECT on non-sensitive scorer columns
GRANT SELECT (id, tournament_id, field, token, created_at) ON public.scorers TO anon, authenticated;
