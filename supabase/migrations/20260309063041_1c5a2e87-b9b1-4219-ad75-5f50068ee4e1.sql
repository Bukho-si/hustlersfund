
-- Add due_date to loans table
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;

-- Add configurable repayment durations to loan_settings
ALTER TABLE public.loan_settings ADD COLUMN IF NOT EXISTS petrol_repayment_days integer NOT NULL DEFAULT 7;
ALTER TABLE public.loan_settings ADD COLUMN IF NOT EXISTS personal_repayment_days integer NOT NULL DEFAULT 30;
