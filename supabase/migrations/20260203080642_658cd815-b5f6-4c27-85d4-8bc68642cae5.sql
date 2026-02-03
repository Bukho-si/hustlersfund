-- Create contribution_settings table (single-row configuration)
CREATE TABLE public.contribution_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  joining_fee_amount numeric NOT NULL DEFAULT 200,
  weekly_subscription_amount numeric NOT NULL DEFAULT 150,
  late_fine_amount numeric NOT NULL DEFAULT 50,
  cash_atm_fee_amount numeric NOT NULL DEFAULT 10,
  petrol_loan_weekly_cap numeric NOT NULL DEFAULT 1500,
  personal_loan_monthly_cap numeric NOT NULL DEFAULT 5000,
  funeral_emergency_amount numeric NOT NULL DEFAULT 200,
  accident_emergency_amount numeric NOT NULL DEFAULT 50,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure all amounts are non-negative
  CONSTRAINT positive_joining_fee CHECK (joining_fee_amount >= 0),
  CONSTRAINT positive_weekly_subscription CHECK (weekly_subscription_amount >= 0),
  CONSTRAINT positive_late_fine CHECK (late_fine_amount >= 0),
  CONSTRAINT positive_cash_atm_fee CHECK (cash_atm_fee_amount >= 0),
  CONSTRAINT positive_petrol_cap CHECK (petrol_loan_weekly_cap >= 0),
  CONSTRAINT positive_personal_cap CHECK (personal_loan_monthly_cap >= 0),
  CONSTRAINT positive_funeral_amount CHECK (funeral_emergency_amount >= 0),
  CONSTRAINT positive_accident_amount CHECK (accident_emergency_amount >= 0)
);

-- Enable RLS
ALTER TABLE public.contribution_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view settings (needed for calculations)
CREATE POLICY "Authenticated users can view settings"
ON public.contribution_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.contribution_settings
FOR UPDATE
USING (is_admin(auth.uid()));

-- Seed the initial settings row
INSERT INTO public.contribution_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001');

-- Create trigger for updated_at
CREATE TRIGGER update_contribution_settings_updated_at
BEFORE UPDATE ON public.contribution_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();