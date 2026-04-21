import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardFinancials {
  totalContributions: number;
  loansIssued: number;
  totalRepayments: number;
  interestEarned: number;
  outstandingLoans: number;
}

/**
 * Cleanly separated financial totals using existing tables.
 * - Contributions: SUM(payments.total_amount) WHERE status = 'verified'
 * - Loans Issued: SUM(loans.amount) WHERE status IN ('approved','disbursed','repaid')
 * - Repayments: SUM(loan_repayments.amount)
 * - Interest Earned: SUM(personal_loan_schedule.current_balance - original_amount)
 * - Outstanding Loans: SUM(loans.outstanding_balance) for non-repaid loans
 */
export function useDashboardFinancials() {
  return useQuery({
    queryKey: ['dashboard-financials'],
    queryFn: async (): Promise<DashboardFinancials> => {
      const [paymentsRes, loansRes, repaymentsRes, scheduleRes] = await Promise.all([
        supabase.from('payments').select('total_amount').eq('status', 'verified'),
        supabase.from('loans').select('amount, outstanding_balance, status'),
        supabase.from('loan_repayments').select('amount'),
        supabase.from('personal_loan_schedule').select('current_balance, original_amount'),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (loansRes.error) throw loansRes.error;
      if (repaymentsRes.error) throw repaymentsRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      const totalContributions = (paymentsRes.data ?? []).reduce(
        (s, p) => s + (Number(p.total_amount) || 0), 0,
      );

      const issuedStatuses = new Set(['approved', 'disbursed', 'repaid']);
      const loansIssued = (loansRes.data ?? [])
        .filter((l) => issuedStatuses.has(l.status))
        .reduce((s, l) => s + (Number(l.amount) || 0), 0);

      const outstandingLoans = (loansRes.data ?? [])
        .filter((l) => l.status !== 'repaid')
        .reduce((s, l) => s + (Number(l.outstanding_balance) || 0), 0);

      const totalRepayments = (repaymentsRes.data ?? []).reduce(
        (s, r) => s + (Number(r.amount) || 0), 0,
      );

      const interestEarned = (scheduleRes.data ?? []).reduce(
        (s, r) => s + Math.max(0, (Number(r.current_balance) || 0) - (Number(r.original_amount) || 0)),
        0,
      );

      return {
        totalContributions,
        loansIssued,
        totalRepayments,
        interestEarned,
        outstandingLoans,
      };
    },
  });
}
