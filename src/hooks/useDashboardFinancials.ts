import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardFinancials {
  totalContributions: number;
  loansIssued: number;
  totalRepayments: number;
  interestEarned: number;
  outstandingLoans: number;
  /** Validation: Loans Issued - Repayments + Interest */
  expectedOutstanding: number;
  /** True if expectedOutstanding ≈ outstandingLoans (within R1 tolerance) */
  isBalanced: boolean;
  /** Difference (expected - actual). Non-zero indicates a reconciliation issue. */
  reconciliationDelta: number;
}

/**
 * STRICTLY SEPARATED financial totals. NO category overlap.
 *
 * - Contributions: SUM(payments.total_amount) WHERE status = 'verified'
 *   ONLY verified subs/fees. NEVER includes loans, repayments, or interest.
 *
 * - Loans Issued: SUM(loans.amount) WHERE status IN ('disbursed','repaid')
 *   ONLY real disbursed money. EXCLUDES pending/approved/rejected/requested.
 *
 * - Repayments: SUM(loan_repayments.amount) for repayments tied to
 *   loans with status IN ('disbursed','repaid').
 *
 * - Interest Earned: SUM(personal_loan_schedule.current_balance - original_amount).
 *   Interest is applied once per calendar month by the DB function
 *   `accrue_personal_loan_interest` (guarded by `last_interest_applied_month`),
 *   so the delta on the schedule equals total interest applied.
 *
 * - Outstanding Loans: SUM(loans.outstanding_balance)
 *   WHERE status IN ('disbursed','repaid').
 *
 * Reconciliation: Outstanding ≈ Loans Issued - Repayments + Interest
 */
export function useDashboardFinancials() {
  return useQuery({
    queryKey: ['dashboard-financials'],
    queryFn: async (): Promise<DashboardFinancials> => {
      const VALID_LOAN_STATUSES: Array<'disbursed' | 'repaid'> = ['disbursed', 'repaid'];

      const [paymentsRes, loansRes, repaymentsRes, scheduleRes] = await Promise.all([
        // Contributions: verified payments only
        supabase.from('payments').select('total_amount').eq('status', 'verified'),
        // Loans: only real disbursed (incl. fully repaid)
        supabase.from('loans').select('id, amount, outstanding_balance').in('status', VALID_LOAN_STATUSES as unknown as string[]),
        // Repayments: all rows; we'll filter by valid loan ids client-side
        supabase.from('loan_repayments').select('amount, loan_id'),
        // Interest tracker
        supabase.from('personal_loan_schedule').select('current_balance, original_amount'),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (loansRes.error) throw loansRes.error;
      if (repaymentsRes.error) throw repaymentsRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      const validLoans = loansRes.data ?? [];
      const validLoanIds = new Set(validLoans.map((l) => l.id));

      // Contributions — verified subs/fees only.
      const totalContributions = (paymentsRes.data ?? []).reduce(
        (s, p) => s + (Number(p.total_amount) || 0), 0,
      );

      // Loans Issued — disbursed/repaid only.
      const loansIssued = validLoans.reduce(
        (s, l) => s + (Number(l.amount) || 0), 0,
      );

      // Outstanding — disbursed/repaid only.
      const outstandingLoans = validLoans.reduce(
        (s, l) => s + (Number(l.outstanding_balance) || 0), 0,
      );

      // Repayments — only for valid loans.
      const totalRepayments = (repaymentsRes.data ?? [])
        .filter((r) => validLoanIds.has(r.loan_id))
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      // Interest Earned — schedule balance growth above original.
      const interestEarned = (scheduleRes.data ?? []).reduce(
        (s, r) => s + Math.max(0, (Number(r.current_balance) || 0) - (Number(r.original_amount) || 0)),
        0,
      );

      // Reconciliation
      const expectedOutstanding = loansIssued - totalRepayments + interestEarned;
      const reconciliationDelta = expectedOutstanding - outstandingLoans;
      const isBalanced = Math.abs(reconciliationDelta) < 1;

      if (!isBalanced) {
        console.warn('[Financials] Reconciliation mismatch', {
          loansIssued,
          totalRepayments,
          interestEarned,
          expectedOutstanding,
          outstandingLoans,
          delta: reconciliationDelta,
        });
      }

      return {
        totalContributions,
        loansIssued,
        totalRepayments,
        interestEarned,
        outstandingLoans,
        expectedOutstanding,
        isBalanced,
        reconciliationDelta,
      };
    },
  });
}
