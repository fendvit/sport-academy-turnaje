
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
