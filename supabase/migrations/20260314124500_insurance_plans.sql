CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  carrier text NOT NULL,
  premium numeric NOT NULL,
  deductible numeric NOT NULL,
  coverage_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.insurance_plans (name, carrier, premium, deductible, coverage_type)
SELECT seed.name, seed.carrier, seed.premium, seed.deductible, seed.coverage_type
FROM (
  VALUES
    ('Basic Health Plan', 'HealthCare Inc', 120, 2000, 'Health'),
    ('Premium Health Plan', 'MediLife', 250, 1000, 'Health'),
    ('Family Protection Plan', 'SafeGuard', 300, 1500, 'Family'),
    ('Auto Secure Plan', 'DriveSafe', 90, 500, 'Auto')
) AS seed(name, carrier, premium, deductible, coverage_type)
WHERE NOT EXISTS (SELECT 1 FROM public.insurance_plans);
