-- Member statement RPC: returns normalized, sorted ledger with running balance.
-- Sources:
--   contributions  -> payments (verified, base + joining + late + cash + emergency)
--   loans          -> loans (status in approved/disbursed/repaid)
--   repayments     -> loan_repayments
--   interest       -> personal_loan_schedule (current_balance - original_amount, on last_interest_applied_month)

CREATE OR REPLACE FUNCTION public.get_member_statement(_user_id uuid)
RETURNS TABLE (
  entry_date timestamptz,
  entry_type text,
  description text,
  amount numeric,
  balance numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: members can read only their own; admins can read anyone's.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> _user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH unioned AS (
    -- Verified contributions (sum of all components on each verified payment)
    SELECT
      COALESCE(p.verified_at, p.submitted_at) AS entry_date,
      'contribution'::text                    AS entry_type,
      'Verified payment'::text                AS description,
      (COALESCE(p.base_amount,0)
        + COALESCE(p.joining_fee_amount,0)
        + COALESCE(p.late_fine_amount,0)
        + COALESCE(p.cash_fee_amount,0)
        + COALESCE(p.emergency_total_amount,0))::numeric AS amount
    FROM payments p
    WHERE p.member_user_id = _user_id
      AND p.status = 'verified'

    UNION ALL

    -- Loans issued (only real outflows)
    SELECT
      COALESCE(l.disbursed_at, l.approved_at, l.requested_at) AS entry_date,
      'loan'::text                                            AS entry_type,
      (l.type::text || ' loan issued')                        AS description,
      l.amount::numeric                                       AS amount
    FROM loans l
    WHERE l.member_user_id = _user_id
      AND l.status IN ('approved','disbursed','repaid')

    UNION ALL

    -- Loan repayments
    SELECT
      lr.paid_at        AS entry_date,
      'repayment'::text AS entry_type,
      'Loan repayment'::text AS description,
      lr.amount::numeric AS amount
    FROM loan_repayments lr
    JOIN loans l ON l.id = lr.loan_id
    WHERE l.member_user_id = _user_id

    UNION ALL

    -- Interest applied (personal loan schedule). One row per schedule with accrued interest.
    SELECT
      COALESCE(s.last_interest_applied_month::timestamptz, s.updated_at) AS entry_date,
      'interest'::text  AS entry_type,
      'Interest applied'::text AS description,
      GREATEST(s.current_balance - s.original_amount, 0)::numeric AS amount
    FROM personal_loan_schedule s
    WHERE s.member_user_id = _user_id
      AND (s.current_balance - s.original_amount) > 0
  ),
  signed AS (
    SELECT
      entry_date,
      entry_type,
      description,
      CASE entry_type
        WHEN 'contribution' THEN amount
        WHEN 'loan'         THEN amount
        WHEN 'interest'     THEN amount
        WHEN 'repayment'    THEN -amount
      END AS amount
    FROM unioned
    WHERE amount IS NOT NULL AND amount <> 0
  ),
  ordered AS (
    SELECT
      entry_date,
      entry_type,
      description,
      amount,
      SUM(amount) OVER (ORDER BY entry_date ASC, entry_type ASC
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
    FROM signed
  )
  SELECT entry_date, entry_type, description, amount, balance
  FROM ordered
  ORDER BY entry_date ASC, entry_type ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_statement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_statement(uuid) TO authenticated;