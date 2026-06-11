
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
