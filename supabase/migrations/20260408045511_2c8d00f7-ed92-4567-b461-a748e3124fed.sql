
-- RPC to verify tournament password using crypt()
CREATE OR REPLACE FUNCTION public.verify_tournament_password(_tournament_id uuid, _password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = _tournament_id
      AND password = crypt(_password, password)
  );
END;
$$;

-- RPC to verify scorer PIN using crypt()
CREATE OR REPLACE FUNCTION public.verify_scorer_pin(_token uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.scorers
    WHERE token = _token
      AND pin = crypt(_pin, pin)
  );
END;
$$;
