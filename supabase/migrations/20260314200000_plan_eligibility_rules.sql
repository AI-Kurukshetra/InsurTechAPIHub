ALTER TABLE IF EXISTS public.insurance_plans
  ADD COLUMN IF NOT EXISTS min_age integer,
  ADD COLUMN IF NOT EXISTS max_age integer,
  ADD COLUMN IF NOT EXISTS requires_non_smoker boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_dependents integer;
