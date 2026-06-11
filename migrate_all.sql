
-- Tournaments table
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date text NOT NULL,
  field_count integer NOT NULL DEFAULT 2,
  password text NOT NULL,
  phase text NOT NULL DEFAULT 'group',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  group_id uuid NOT NULL
);

-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL
);

-- Matches table
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  group_id uuid NOT NULL,
  home_team_id uuid NOT NULL,
  away_team_id uuid NOT NULL,
  home_score integer,
  away_score integer,
  field integer NOT NULL DEFAULT 1,
  match_order integer NOT NULL DEFAULT 0,
  played boolean NOT NULL DEFAULT false
);

-- Playoff matches table
CREATE TABLE public.playoff_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round integer NOT NULL,
  position integer NOT NULL DEFAULT 0,
  home_team_id uuid,
  away_team_id uuid,
  home_score integer,
  away_score integer,
  played boolean NOT NULL DEFAULT false,
  field integer NOT NULL DEFAULT 1
);

-- Enable RLS on all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playoff_matches ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth needed for viewing)
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read playoff_matches" ON public.playoff_matches FOR SELECT USING (true);

-- Public insert/update/delete (admin auth is handled at app level with shared password)
CREATE POLICY "Public insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tournaments" ON public.tournaments FOR UPDATE USING (true);
CREATE POLICY "Public delete tournaments" ON public.tournaments FOR DELETE USING (true);

CREATE POLICY "Public insert teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert groups" ON public.groups FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matches" ON public.matches FOR UPDATE USING (true);

CREATE POLICY "Public insert playoff_matches" ON public.playoff_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update playoff_matches" ON public.playoff_matches FOR UPDATE USING (true);
CREATE POLICY "Public delete playoff_matches" ON public.playoff_matches FOR DELETE USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playoff_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER TABLE public.matches ADD COLUMN scheduled_time text DEFAULT null;

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  tournament_id uuid NOT NULL,
  name text NOT NULL,
  number integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read players" ON public.players FOR SELECT TO public USING (true);
CREATE POLICY "Public insert players" ON public.players FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update players" ON public.players FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete players" ON public.players FOR DELETE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER TABLE public.tournaments ADD COLUMN category TEXT NOT NULL DEFAULT '';

CREATE TABLE public.scorers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  field integer NOT NULL,
  pin text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, field)
);

ALTER TABLE public.scorers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scorers" ON public.scorers FOR SELECT TO public USING (true);
CREATE POLICY "Public insert scorers" ON public.scorers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update scorers" ON public.scorers FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete scorers" ON public.scorers FOR DELETE TO public USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.scorers;
ALTER TABLE tournaments ADD COLUMN match_duration_minutes integer NOT NULL DEFAULT 12;
ALTER TABLE tournaments ADD COLUMN break_duration_minutes integer NOT NULL DEFAULT 3;
ALTER TABLE tournaments ADD COLUMN start_time text NOT NULL DEFAULT '09:00';
ALTER TABLE matches ADD COLUMN active boolean NOT NULL DEFAULT false;
CREATE POLICY "Public delete teams" ON teams FOR DELETE TO public USING (true);
CREATE POLICY "Public delete matches" ON matches FOR DELETE TO public USING (true);
ALTER TABLE public.playoff_matches ADD COLUMN active boolean NOT NULL DEFAULT false;
ALTER TABLE public.teams ADD COLUMN trainer text DEFAULT null;
CREATE POLICY "Public update teams" ON public.teams FOR UPDATE TO public USING (true) WITH CHECK (true);
-- Revoke SELECT on the password column from anon and authenticated roles
-- This prevents clients from reading tournament passwords
REVOKE SELECT (password) ON public.tournaments FROM anon, authenticated;
-- Re-grant SELECT on all non-sensitive columns for anon and authenticated
GRANT SELECT (id, name, date, created_at, phase, field_count, category, match_duration_minutes, break_duration_minutes, start_time) ON public.tournaments TO anon, authenticated;

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
ALTER TABLE public.tournaments ADD COLUMN round_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.playoff_matches ADD COLUMN scheduled_time text DEFAULT NULL;
ALTER TABLE public.tournaments ADD COLUMN playoff_start_time text DEFAULT NULL;
ALTER TABLE public.tournaments ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.tournaments ADD COLUMN tiebreaker_rule text NOT NULL DEFAULT 'head_to_head';
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS playoff_format text NOT NULL DEFAULT 'placement',
  ADD COLUMN IF NOT EXISTS playoff_match_duration_minutes integer;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_playoff_format_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_playoff_format_check
  CHECK (playoff_format IN ('placement', 'bracket'));
ALTER TABLE tournaments ADD COLUMN playoff_consolation_matches boolean NOT NULL DEFAULT false;
