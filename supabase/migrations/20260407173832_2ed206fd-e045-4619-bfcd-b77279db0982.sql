-- Re-grant SELECT on all non-sensitive columns for anon and authenticated
GRANT SELECT (id, name, date, created_at, phase, field_count, category, match_duration_minutes, break_duration_minutes, start_time) ON public.tournaments TO anon, authenticated;
