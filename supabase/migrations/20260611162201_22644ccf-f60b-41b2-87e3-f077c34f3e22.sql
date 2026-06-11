ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS playoff_format text NOT NULL DEFAULT 'placement',
  ADD COLUMN IF NOT EXISTS playoff_match_duration_minutes integer;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_playoff_format_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_playoff_format_check
  CHECK (playoff_format IN ('placement', 'bracket'));