CREATE TABLE IF NOT EXISTS public.employer_company_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employer_company_plans_unique
ON public.employer_company_plans (employer_id, plan_id);

ALTER TABLE public.employer_company_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers can read own company plans" ON public.employer_company_plans;
DROP POLICY IF EXISTS "Employers can manage own company plans" ON public.employer_company_plans;
DROP POLICY IF EXISTS "Admins can read all company plans" ON public.employer_company_plans;

CREATE POLICY "Employers can read own company plans"
  ON public.employer_company_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can manage own company plans"
  ON public.employer_company_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Admins can read all company plans"
  ON public.employer_company_plans
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
