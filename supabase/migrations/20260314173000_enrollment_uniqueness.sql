CREATE UNIQUE INDEX IF NOT EXISTS enrollments_unique_active_per_user_plan
ON public.enrollments (user_id, plan_id)
WHERE status = 'active';
