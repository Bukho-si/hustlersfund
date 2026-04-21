import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardFinancials {
  totalContributions: number;
  loansIssued: number;
  totalRepayments: number;
  interestEarned: number;
  outstandingLoans: number;
  /** Validation: should equal outstandingLoans (Loans Issued - Repayments + Interest) */
  expectedOutstanding: number;
  isBalanced: boolean;
}

/**
 * Strictly separated financial totals. NO category overlap.
 *
 * - Contributions: SUM(payments.base_amount + joining_fee + late_fine + cash_fee + emergency)
 *   WHERE status = 'verified'. NEVER includes loans or repayments.
 * - Loans Issued: SUM(loans.amount) — every loan ever issued.
 * - Repayments: SUM(loan_repayments.amount) — money paid back by members.
 * - Interest Earned: SUM(personal_loan_schedule.current_balance - original_amount)
 *   tracked separately, never hidden inside contributions.
 * - Outstanding Loans: SUM(loans.outstanding_balance).
 *
 * Validation: Outstanding ≈ Loans Issued - Repayments + Interest
 */
export function useDashboardFinancials() {
  return useQuery({
    queryKey: ['dashboard-financials'],
    queryFn: async (): Promise<DashboardFinancials> => {
      const [paymentsRes, loansRes, repaymentsRes, scheduleRes] = await Promise.all([
        supabase.from('payments').select('total_amount').eq('status', 'verified'),
        supabase.from('loans').select('amount, outstanding_balance'),
        supabase.from('loan_repayments').select('amount'),
        supabase.from('personal_loan_schedule').select('current_balance, original_amount'),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (loansRes.error) throw loansRes.error;
      if (repaymentsRes.error) throw repaymentsRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      // Contributions — ONLY verified payments. No loans, no repayments.
      const totalContributions = (paymentsRes.data ?? []).reduce(
        (s, p) => s + (Number(p.total_amount) || 0), 0,
      );

      // Loans Issued — ALL loans ever created (full principal).
      const loansIssued = (loansRes.data ?? []).reduce(
        (s, l) => s + (Number(l.amount) || 0), 0,
      );

      // Outstanding — current unpaid balance across all loans.
      const outstandingLoans = (loansRes.data ?? []).reduce(
        (s, l) => s + (Number(l.outstanding_balance) || 0), 0,
      );

      // Repayments — money paid back. Never mixed with contributions.
      const totalRepayments = (repaymentsRes.data ?? []).reduce(
        (s, r) => s + (Number(r.amount) || 0), 0,
      );

      // Interest Earned — tracked separately as growth in loan balance.
      const interestEarned = (scheduleRes.data ?? []).reduce(
        (s, r) => s + Math.max(0, (Number(r.current_balance) || 0) - (Number(r.original_amount) || 0)),
        0,
      );

      // Validation: Outstanding should equal Loans Issued - Repayments + Interest
      const expectedOutstanding = loansIssued - totalRepayments + interestEarned;
      const isBalanced = Math.abs(expectedOutstanding - outstandingLoans) < 1;

      return {
        totalContributions,
        loansIssued,
        totalRepayments,
        interestEarned,
        outstandingLoans,
        expectedOutstanding,
        isBalanced,
      };
    },
  });
}
