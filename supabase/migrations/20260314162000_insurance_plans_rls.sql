ALTER TABLE IF EXISTS public.insurance_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can insert insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can update insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can delete insurance plans" ON public.insurance_plans;

CREATE POLICY "Authenticated users can read insurance plans"
  ON public.insurance_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert insurance plans"
  ON public.insurance_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update insurance plans"
  ON public.insurance_plans
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete insurance plans"
  ON public.insurance_plans
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
