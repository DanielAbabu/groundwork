ALTER TABLE public.scenario_progress ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'debugging';
ALTER TABLE public.scenario_runs ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'debugging';

CREATE TABLE public.design_stage_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scenario_id text NOT NULL,
  stage_id text NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  score numeric NOT NULL DEFAULT 0,
  answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, scenario_id, stage_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_stage_results TO authenticated;
GRANT ALL ON public.design_stage_results TO service_role;

ALTER TABLE public.design_stage_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stage results" ON public.design_stage_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stage results" ON public.design_stage_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stage results" ON public.design_stage_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_design_stage_results_updated_at BEFORE UPDATE ON public.design_stage_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();