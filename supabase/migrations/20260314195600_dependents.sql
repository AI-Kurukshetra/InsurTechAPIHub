CREATE TABLE IF NOT EXISTS public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  age integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can insert own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can update own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can delete own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Admins can read all dependents" ON public.dependents;

CREATE POLICY "Users can read own dependents"
  ON public.dependents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dependents"
  ON public.dependents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dependents"
  ON public.dependents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dependents"
  ON public.dependents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all dependents"
  ON public.dependents
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
