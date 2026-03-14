ALTER TABLE IF EXISTS public.insurance_plans
  ADD COLUMN IF NOT EXISTS network_type text NOT NULL DEFAULT 'PPO',
  ADD COLUMN IF NOT EXISTS copay numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS out_of_pocket_max numeric NOT NULL DEFAULT 6000,
  ADD COLUMN IF NOT EXISTS includes_dental boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_vision boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_telemedicine boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prescription_coverage text NOT NULL DEFAULT 'Standard';

UPDATE public.insurance_plans
SET
  network_type = COALESCE(network_type, 'PPO'),
  copay = COALESCE(copay, 30),
  out_of_pocket_max = COALESCE(out_of_pocket_max, 6000),
  includes_dental = COALESCE(includes_dental, false),
  includes_vision = COALESCE(includes_vision, false),
  includes_telemedicine = COALESCE(includes_telemedicine, true),
  prescription_coverage = COALESCE(prescription_coverage, 'Standard');
