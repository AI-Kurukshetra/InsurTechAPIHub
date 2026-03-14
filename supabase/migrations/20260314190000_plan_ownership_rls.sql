ALTER TABLE IF EXISTS public.insurance_plans
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role text CHECK (created_by_role IN ('admin', 'employer'));

UPDATE public.insurance_plans
SET created_by_role = 'admin'
WHERE created_by_role IS NULL;

ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can insert insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can update insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins can delete insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins and employers can insert insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins and owner employers can update insurance plans" ON public.insurance_plans;
DROP POLICY IF EXISTS "Admins and owner employers can delete insurance plans" ON public.insurance_plans;

CREATE POLICY "Authenticated users can read insurance plans"
  ON public.insurance_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and employers can insert insurance plans"
  ON public.insurance_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (public.is_admin(auth.uid()) AND created_by_role = 'admin')
      OR (
        created_by_role = 'employer'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'employer'
        )
      )
    )
  );

CREATE POLICY "Admins and owner employers can update insurance plans"
  ON public.insurance_plans
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'employer'
      )
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND created_by_role = 'employer'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'employer'
      )
    )
  );

CREATE POLICY "Admins and owner employers can delete insurance plans"
  ON public.insurance_plans
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      created_by = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'employer'
      )
    )
  );
