CREATE TABLE IF NOT EXISTS public.insurance_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_carriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read carriers" ON public.insurance_carriers;
DROP POLICY IF EXISTS "Admins can insert carriers" ON public.insurance_carriers;
DROP POLICY IF EXISTS "Admins can update carriers" ON public.insurance_carriers;
DROP POLICY IF EXISTS "Admins can delete carriers" ON public.insurance_carriers;

CREATE POLICY "Authenticated users can read carriers"
  ON public.insurance_carriers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert carriers"
  ON public.insurance_carriers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update carriers"
  ON public.insurance_carriers
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete carriers"
  ON public.insurance_carriers
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
