
-- Add new role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'emergency_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'petrol_loan_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'personal_loan_admin';
