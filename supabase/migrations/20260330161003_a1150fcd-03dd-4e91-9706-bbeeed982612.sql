
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
