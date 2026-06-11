ALTER TABLE tournaments ADD COLUMN match_duration_minutes integer NOT NULL DEFAULT 12;
ALTER TABLE tournaments ADD COLUMN break_duration_minutes integer NOT NULL DEFAULT 3;
ALTER TABLE tournaments ADD COLUMN start_time text NOT NULL DEFAULT '09:00';
ALTER TABLE matches ADD COLUMN active boolean NOT NULL DEFAULT false;
CREATE POLICY "Public delete teams" ON teams FOR DELETE TO public USING (true);
CREATE POLICY "Public delete matches" ON matches FOR DELETE TO public USING (true);