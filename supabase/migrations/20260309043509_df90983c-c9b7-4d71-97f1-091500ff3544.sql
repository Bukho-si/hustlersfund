
-- Petrol Fund Balance Tracker
CREATE TABLE public.petrol_fund (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_balance numeric NOT NULL DEFAULT 0,
  low_balance_threshold numeric NOT NULL DEFAULT 5000,
  last_updated timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.petrol_fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage petrol fund" ON public.petrol_fund FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view petrol fund" ON public.petrol_fund FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.petrol_fund (current_balance, low_balance_threshold) VALUES (0, 5000);

-- Petrol Request Time Window
CREATE TABLE public.petrol_request_window (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time time NOT NULL DEFAULT '06:00:00',
  end_time time NOT NULL DEFAULT '10:00:00',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.petrol_request_window ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage request window" ON public.petrol_request_window FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view request window" ON public.petrol_request_window FOR SELECT USING (true);

-- Insert default row
INSERT INTO public.petrol_request_window (start_time, end_time, active) VALUES ('06:00:00', '10:00:00', true);

-- Trigger: update petrol fund on loan disbursement
CREATE OR REPLACE FUNCTION public.update_petrol_fund_on_disbursement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct on petrol loan disbursement
  IF NEW.type = 'petrol' AND NEW.status = 'disbursed' AND (OLD.status IS DISTINCT FROM 'disbursed') THEN
    UPDATE petrol_fund SET current_balance = current_balance - NEW.amount, last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_petrol_fund_disbursement
  AFTER UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_petrol_fund_on_disbursement();

-- Trigger: update petrol fund on repayment
CREATE OR REPLACE FUNCTION public.update_petrol_fund_on_repayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan_type text;
BEGIN
  SELECT type INTO v_loan_type FROM public.loans WHERE id = NEW.loan_id;
  IF v_loan_type = 'petrol' THEN
    UPDATE petrol_fund SET current_balance = current_balance + NEW.amount, last_updated = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_petrol_fund_repayment
  AFTER INSERT ON public.loan_repayments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_petrol_fund_on_repayment();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.petrol_fund;
