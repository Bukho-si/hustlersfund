CREATE OR REPLACE FUNCTION public.get_member_statement(_user_id uuid)
 RETURNS TABLE(entry_date timestamp with time zone, entry_type text, description text, amount numeric, savings_balance numeric, loan_balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() <> _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH unioned AS (
    SELECT COALESCE(p.verified_at, p.submitted_at) AS d, 'contribution'::text AS t, 'Verified payment'::text AS desc_,
      (COALESCE(p.base_amount,0)+COALESCE(p.joining_fee_amount,0)+COALESCE(p.late_fine_amount,0)+COALESCE(p.cash_fee_amount,0)+COALESCE(p.emergency_total_amount,0))::numeric AS amt
    FROM payments p WHERE p.member_user_id = _user_id AND p.status = 'verified'
    UNION ALL
    SELECT COALESCE(l.disbursed_at, l.approved_at, l.requested_at), 'loan', (l.type::text || ' loan issued'), l.amount::numeric
    FROM loans l WHERE l.member_user_id = _user_id AND l.status IN ('approved','disbursed','repaid')
    UNION ALL
    SELECT COALESCE(l.disbursed_at, l.approved_at, l.requested_at), 'interest',
      ('Loan interest (' || COALESCE(l.interest_rate_percent::text,'0') || '%)'),
      COALESCE(l.interest_amount, 0)::numeric
    FROM loans l WHERE l.member_user_id = _user_id AND l.status IN ('approved','disbursed','repaid')
      AND COALESCE(l.interest_amount, 0) > 0
    UNION ALL
    SELECT lr.paid_at, 'repayment', 'Loan repayment', lr.amount::numeric
    FROM loan_repayments lr JOIN loans l ON l.id = lr.loan_id WHERE l.member_user_id = _user_id
    UNION ALL
    SELECT COALESCE(s.last_interest_applied_month::timestamptz, s.updated_at), 'interest', 'Additional interest applied',
      GREATEST(s.current_balance - s.original_amount, 0)::numeric
    FROM personal_loan_schedule s WHERE s.member_user_id = _user_id AND (s.current_balance - s.original_amount) > 0
  ),
  signed AS (
    SELECT u.d AS d, u.t AS t, u.desc_ AS desc_, u.amt AS amt,
      CASE WHEN u.t = 'contribution' THEN u.amt ELSE 0 END AS savings_delta,
      CASE u.t
        WHEN 'loan' THEN u.amt
        WHEN 'interest' THEN u.amt
        WHEN 'repayment' THEN -u.amt
        ELSE 0
      END AS loan_delta
    FROM unioned u WHERE u.amt IS NOT NULL AND u.amt <> 0
  ),
  ordered AS (
    SELECT s.d, s.t, s.desc_,
      CASE WHEN s.t = 'repayment' THEN -s.amt ELSE s.amt END AS display_amount,
      SUM(s.savings_delta) OVER (ORDER BY s.d ASC, s.t ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS sav_bal,
      SUM(s.loan_delta) OVER (ORDER BY s.d ASC, s.t ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS loan_bal
    FROM signed s
  )
  SELECT o.d, o.t, o.desc_, o.display_amount, o.sav_bal, o.loan_bal FROM ordered o ORDER BY o.d ASC, o.t ASC;
END;
$function$;