
-- Create personal_loan_fund table
CREATE TABLE public.personal_loan_fund (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_balance numeric NOT NULL DEFAULT 0,
  low_balance_threshold numeric NOT NULL DEFAULT 10000,
  last_updated timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_loan_fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personal loan fund" ON public.personal_loan_fund FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view personal loan fund" ON public.personal_loan_fund FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.personal_loan_fund (current_balance, low_balance_threshold) VALUES (0, 10000);

-- Create personal_loan_activity table
CREATE TABLE public.personal_loan_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_loan_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert personal loan activity" ON public.personal_loan_activity FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view personal loan activity" ON public.personal_loan_activity FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Nobody can delete personal loan activity" ON public.personal_loan_activity FOR DELETE USING (false);
CREATE POLICY "Nobody can update personal loan activity" ON public.personal_loan_activity FOR UPDATE USING (false);

-- Trigger: deduct from personal fund on loan approval (personal loans approve = disburse)
CREATE OR REPLACE FUNCTION public.update_personal_fund_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'personal' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE personal_loan_fund SET current_balance = current_balance - NEW.amount, last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_personal_fund_on_approval
  AFTER UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_personal_fund_on_approval();

-- Trigger: add to personal fund on repayment
CREATE OR REPLACE FUNCTION public.update_personal_fund_on_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan_type text;
BEGIN
  SELECT type INTO v_loan_type FROM public.loans WHERE id = NEW.loan_id;
  IF v_loan_type = 'personal' THEN
    UPDATE personal_loan_fund SET current_balance = current_balance + NEW.amount, last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_personal_fund_on_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW EXECUTE FUNCTION public.update_personal_fund_on_repayment();
