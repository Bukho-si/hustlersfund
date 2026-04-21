-- Schedule table for personal loan installments
CREATE TABLE public.personal_loan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  due_date date NOT NULL,
  original_amount numeric NOT NULL,
  current_balance numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','late')),
  months_late integer NOT NULL DEFAULT 0,
  last_interest_applied_month date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pls_loan ON public.personal_loan_schedule(loan_id);
CREATE INDEX idx_pls_member ON public.personal_loan_schedule(member_user_id);
CREATE INDEX idx_pls_due_status ON public.personal_loan_schedule(due_date, status);

ALTER TABLE public.personal_loan_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own schedule"
  ON public.personal_loan_schedule FOR SELECT
  USING (auth.uid() = member_user_id);

CREATE POLICY "Admins view all schedule"
  ON public.personal_loan_schedule FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins insert schedule"
  ON public.personal_loan_schedule FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins update schedule"
  ON public.personal_loan_schedule FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Nobody deletes schedule"
  ON public.personal_loan_schedule FOR DELETE
  USING (false);

CREATE TRIGGER pls_updated_at
  BEFORE UPDATE ON public.personal_loan_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a single installment when a personal loan is approved
CREATE OR REPLACE FUNCTION public.create_schedule_on_personal_loan_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_due date;
BEGIN
  IF NEW.type = 'personal' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Avoid duplicates if trigger fires again
    IF NOT EXISTS (SELECT 1 FROM personal_loan_schedule WHERE loan_id = NEW.id) THEN
      v_amount := COALESCE(NEW.total_repayable, NEW.amount);
      v_due := COALESCE(NEW.due_date, now() + interval '30 days')::date;
      INSERT INTO personal_loan_schedule (loan_id, member_user_id, due_date, original_amount, current_balance)
      VALUES (NEW.id, NEW.member_user_id, v_due, v_amount, v_amount);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_schedule_on_personal_loan_approved
  AFTER UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.create_schedule_on_personal_loan_approved();

-- Accrual function: applies 15% per newly-missed month, capped at 1.5x original per installment
CREATE OR REPLACE FUNCTION public.accrue_personal_loan_interest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_months_late int;
  v_new_months int;
  v_interest numeric;
  v_new_balance numeric;
  v_max numeric;
  v_current_month date := date_trunc('month', now())::date;
  v_processed int := 0;
  v_updated int := 0;
BEGIN
  FOR rec IN
    SELECT * FROM personal_loan_schedule
    WHERE status <> 'paid' AND due_date < CURRENT_DATE
  LOOP
    v_processed := v_processed + 1;

    -- Total whole months between due_date and today
    v_months_late := GREATEST(0,
      (EXTRACT(YEAR FROM age(CURRENT_DATE, rec.due_date)) * 12
       + EXTRACT(MONTH FROM age(CURRENT_DATE, rec.due_date)))::int
    );

    IF v_months_late <= 0 THEN
      CONTINUE;
    END IF;

    -- New months since last accrual
    v_new_months := v_months_late - COALESCE(rec.months_late, 0);

    -- Skip if already accrued this calendar month
    IF rec.last_interest_applied_month IS NOT NULL
       AND rec.last_interest_applied_month >= v_current_month THEN
      -- still mark as late if not yet
      IF rec.status <> 'late' THEN
        UPDATE personal_loan_schedule
        SET status = 'late', months_late = v_months_late, updated_at = now()
        WHERE id = rec.id;
        v_updated := v_updated + 1;
      END IF;
      CONTINUE;
    END IF;

    IF v_new_months <= 0 THEN
      IF rec.status <> 'late' THEN
        UPDATE personal_loan_schedule
        SET status = 'late', updated_at = now()
        WHERE id = rec.id;
        v_updated := v_updated + 1;
      END IF;
      CONTINUE;
    END IF;

    v_max := rec.original_amount * 1.5;
    v_interest := rec.current_balance * 0.15 * v_new_months;
    v_new_balance := LEAST(rec.current_balance + v_interest, v_max);

    UPDATE personal_loan_schedule
    SET current_balance = v_new_balance,
        months_late = v_months_late,
        last_interest_applied_month = v_current_month,
        status = 'late',
        updated_at = now()
    WHERE id = rec.id;

    -- Mirror new balance onto parent loan's outstanding_balance
    UPDATE loans
    SET outstanding_balance = (
      SELECT COALESCE(SUM(current_balance), 0)
      FROM personal_loan_schedule
      WHERE loan_id = rec.loan_id AND status <> 'paid'
    ),
    updated_at = now()
    WHERE id = rec.loan_id;

    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'updated', v_updated, 'run_at', now());
END;
$$;