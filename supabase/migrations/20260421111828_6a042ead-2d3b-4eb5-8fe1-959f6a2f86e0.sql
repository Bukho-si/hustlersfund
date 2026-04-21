-- Backfill function: reconcile personal_loan_schedule with interest already
-- baked into loans.outstanding_balance.
CREATE OR REPLACE FUNCTION public.backfill_personal_loan_interest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_repaid numeric;
  v_principal_remaining numeric;
  v_interest numeric;
  v_max numeric;
  v_target_balance numeric;
  v_processed int := 0;
  v_updated int := 0;
  v_total_interest numeric := 0;
BEGIN
  FOR rec IN
    SELECT l.id AS loan_id,
           l.member_user_id,
           l.amount AS original_amount,
           l.outstanding_balance,
           COALESCE(l.due_date, now() + interval '30 days')::date AS due_date
    FROM loans l
    WHERE l.type = 'personal'
      AND l.status IN ('approved','disbursed')
  LOOP
    v_processed := v_processed + 1;

    SELECT COALESCE(SUM(amount), 0) INTO v_repaid
    FROM loan_repayments WHERE loan_id = rec.loan_id;

    -- Principal still owed if there were no interest
    v_principal_remaining := GREATEST(rec.original_amount - v_repaid, 0);
    -- Interest = whatever the outstanding balance carries above principal
    v_interest := GREATEST(rec.outstanding_balance - v_principal_remaining, 0);
    -- Apply same cap as accrual function (1.5x original)
    v_max := rec.original_amount * 1.5;
    v_target_balance := LEAST(rec.outstanding_balance, v_max);

    -- Ensure schedule row exists
    INSERT INTO personal_loan_schedule
      (loan_id, member_user_id, due_date, original_amount, current_balance, status)
    VALUES
      (rec.loan_id, rec.member_user_id, rec.due_date, rec.original_amount, v_target_balance,
       CASE WHEN rec.due_date < CURRENT_DATE AND v_interest > 0 THEN 'late' ELSE 'pending' END)
    ON CONFLICT DO NOTHING;

    -- Update the schedule so current_balance reflects principal+interest,
    -- only when it's currently understated.
    UPDATE personal_loan_schedule
    SET current_balance = v_target_balance,
        status = CASE
                   WHEN v_target_balance <= 0 THEN 'paid'
                   WHEN due_date < CURRENT_DATE AND v_interest > 0 THEN 'late'
                   ELSE status
                 END,
        updated_at = now()
    WHERE loan_id = rec.loan_id
      AND current_balance < v_target_balance;

    IF FOUND THEN
      v_updated := v_updated + 1;
      v_total_interest := v_total_interest + v_interest;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'updated', v_updated,
    'total_interest_backfilled', v_total_interest,
    'run_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_personal_loan_interest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_personal_loan_interest() TO authenticated;