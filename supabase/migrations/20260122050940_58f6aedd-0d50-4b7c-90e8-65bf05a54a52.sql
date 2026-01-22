-- Create loan_settings table with default interest rates
CREATE TABLE public.loan_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  petrol_interest_rate_percent numeric NOT NULL DEFAULT 10,
  personal_interest_rate_percent numeric NOT NULL DEFAULT 15,
  interest_type text NOT NULL DEFAULT 'SIMPLE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Authenticated users can view loan settings"
ON public.loan_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update loan settings"
ON public.loan_settings
FOR UPDATE
USING (is_admin(auth.uid()));

-- Insert default settings row
INSERT INTO public.loan_settings (petrol_interest_rate_percent, personal_interest_rate_percent, interest_type)
VALUES (10, 15, 'SIMPLE');

-- Add interest fields to loans table
ALTER TABLE public.loans 
ADD COLUMN interest_rate_percent numeric DEFAULT 0,
ADD COLUMN interest_amount numeric DEFAULT 0,
ADD COLUMN total_repayable numeric DEFAULT 0,
ADD COLUMN repayment_period text DEFAULT NULL;

-- Add trigger for updated_at on loan_settings
CREATE TRIGGER update_loan_settings_updated_at
BEFORE UPDATE ON public.loan_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();