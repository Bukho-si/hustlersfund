
-- Step 1: Just add the new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accident_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'funeral_admin';
