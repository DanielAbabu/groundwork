ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

UPDATE public.profiles p
SET username = 'user_' || substr(replace(p.id::text, '-', ''), 1, 8)
WHERE p.username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_name text;
  candidate text;
  suffix int := 0;
BEGIN
  base_name := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  IF base_name IS NULL OR base_name = '' THEN
    base_name := 'oncall';
  END IF;
  candidate := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_name || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)), candidate)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TABLE public.scenario_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario_id text NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.scenario_runs TO authenticated;
GRANT ALL ON public.scenario_runs TO service_role;
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own runs" ON public.scenario_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own runs" ON public.scenario_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX scenario_runs_user_created_idx ON public.scenario_runs (user_id, created_at DESC);

CREATE TABLE public.nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text NOT NULL DEFAULT 'Get back on call!',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.nudges TO authenticated;
GRANT ALL ON public.nudges TO service_role;
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view nudges they sent or received" ON public.nudges FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send nudges" ON public.nudges FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id);
CREATE POLICY "Users can delete nudges they received" ON public.nudges FOR DELETE TO authenticated USING (auth.uid() = to_user_id);
CREATE INDEX nudges_to_user_idx ON public.nudges (to_user_id, created_at DESC);