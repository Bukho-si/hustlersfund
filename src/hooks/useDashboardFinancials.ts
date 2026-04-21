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
 * Cleanly separated financial totals sourced from the backend ledger.
 * - Contributions: weekly_contribution + joining_fee + emergency_contribution + late_fee + cash_fee
 * - Loans Issued: petrol_loan_issued + personal_loan_issued
 * - Repayments: petrol_loan_repayment + personal_loan_repayment
 * - Interest Earned: derived from personal_loan_schedule (current_balance - original_amount)
 * - Outstanding Loans: SUM(loans.outstanding_balance) for non-repaid loans
 */
export function useDashboardFinancials() {
  return useQuery({
    queryKey: ['dashboard-financials'],
    queryFn: async (): Promise<DashboardFinancials> => {
      const [ledgerRes, loansRes, scheduleRes] = await Promise.all([
        supabase.from('financial_ledger').select('transaction_type, amount'),
        supabase.from('loans').select('outstanding_balance, status'),
        supabase.from('personal_loan_schedule').select('current_balance, original_amount'),
      ]);

      if (ledgerRes.error) throw ledgerRes.error;
      if (loansRes.error) throw loansRes.error;
      if (scheduleRes.error) throw scheduleRes.error;

      const contributionTypes = new Set([
        'weekly_contribution',
        'joining_fee',
        'emergency_contribution',
        'late_fee',
        'cash_fee',
      ]);
      const loanIssuedTypes = new Set(['petrol_loan_issued', 'personal_loan_issued']);
      const repaymentTypes = new Set(['petrol_loan_repayment', 'personal_loan_repayment']);

      let totalContributions = 0;
      let loansIssued = 0;
      let totalRepayments = 0;

      for (const row of ledgerRes.data ?? []) {
        const amt = Number(row.amount) || 0;
        if (contributionTypes.has(row.transaction_type)) totalContributions += amt;
        else if (loanIssuedTypes.has(row.transaction_type)) loansIssued += amt;
        else if (repaymentTypes.has(row.transaction_type)) totalRepayments += amt;
      }

      const outstandingLoans = (loansRes.data ?? [])
        .filter((l) => l.status !== 'repaid')
        .reduce((s, l) => s + (Number(l.outstanding_balance) || 0), 0);

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
