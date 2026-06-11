-- Revoke SELECT on the password column from anon and authenticated roles
-- This prevents clients from reading tournament passwords
REVOKE SELECT (password) ON public.tournaments FROM anon, authenticated;
