import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LedgerTransactionType =
  | 'joining_fee'
  | 'weekly_contribution'
  | 'petrol_loan_issued'
  | 'petrol_loan_repayment'
  | 'personal_loan_issued'
  | 'personal_loan_repayment'
  | 'emergency_contribution'
  | 'late_fee'
  | 'cash_fee';

export interface LedgerEntry {
  id: string;
  member_user_id: string;
  transaction_type: LedgerTransactionType;
  amount: number;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  memberName?: string;
}

export interface LedgerSummary {
  totalContributions: number;
  totalJoiningFees: number;
  totalLoansIssued: number;
  totalLoanRepayments: number;
  totalEmergencyContributions: number;
  totalLateFees: number;
  totalCashFees: number;
  netPosition: number;
}

const TRANSACTION_LABELS: Record<LedgerTransactionType, string> = {
  joining_fee: 'Joining Fee',
  weekly_contribution: 'Weekly Contribution',
  petrol_loan_issued: 'Petrol Loan Issued',
  petrol_loan_repayment: 'Petrol Loan Repayment',
  personal_loan_issued: 'Personal Loan Issued',
  personal_loan_repayment: 'Personal Loan Repayment',
  emergency_contribution: 'Emergency Contribution',
  late_fee: 'Late Fee',
  cash_fee: 'Cash/ATM Fee',
};

export function getTransactionLabel(type: LedgerTransactionType): string {
  return TRANSACTION_LABELS[type] || type;
}

export function isDebitTransaction(type: LedgerTransactionType): boolean {
  return type === 'petrol_loan_issued' || type === 'personal_loan_issued';
}

export function useLedgerEntries(options?: {
  memberUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: LedgerTransactionType;
  limit?: number;
}) {
  const { memberUserId, dateFrom, dateTo, transactionType, limit = 100 } = options || {};

  return useQuery({
    queryKey: ['financial-ledger', memberUserId, dateFrom, dateTo, transactionType, limit],
    queryFn: async (): Promise<LedgerEntry[]> => {
      let query = supabase
        .from('financial_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (memberUserId) query = query.eq('member_user_id', memberUserId);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);
      if (transactionType) query = query.eq('transaction_type', transactionType);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch member names
      if (data && data.length > 0) {
        const memberIds = [...new Set(data.map((e: any) => e.member_user_id))];
        const { data: profiles } = await supabase
          .from('member_profiles')
          .select('user_id, full_name')
          .in('user_id', memberIds);

        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        return data.map((e: any) => ({
          ...e,
          amount: Number(e.amount),
          memberName: nameMap.get(e.member_user_id) || 'Unknown',
        }));
      }

      return [];
    },
    refetchInterval: 30000,
  });
}

export function useMemberLedgerSummary(memberUserId?: string) {
  return useQuery({
    queryKey: ['ledger-summary', memberUserId],
    queryFn: async (): Promise<LedgerSummary> => {
      let query = supabase.from('financial_ledger').select('transaction_type, amount');
      if (memberUserId) query = query.eq('member_user_id', memberUserId);

      const { data, error } = await query;
      if (error) throw error;

      const summary: LedgerSummary = {
        totalContributions: 0,
        totalJoiningFees: 0,
        totalLoansIssued: 0,
        totalLoanRepayments: 0,
        totalEmergencyContributions: 0,
        totalLateFees: 0,
        totalCashFees: 0,
        netPosition: 0,
      };

      data?.forEach((entry: any) => {
        const amt = Number(entry.amount);
        switch (entry.transaction_type) {
          case 'weekly_contribution':
            summary.totalContributions += amt;
            break;
          case 'joining_fee':
            summary.totalJoiningFees += amt;
            break;
          case 'petrol_loan_issued':
          case 'personal_loan_issued':
            summary.totalLoansIssued += amt;
            break;
          case 'petrol_loan_repayment':
          case 'personal_loan_repayment':
            summary.totalLoanRepayments += amt;
            break;
          case 'emergency_contribution':
            summary.totalEmergencyContributions += amt;
            break;
          case 'late_fee':
            summary.totalLateFees += amt;
            break;
          case 'cash_fee':
            summary.totalCashFees += amt;
            break;
        }
      });

      // Net = contributions + fees + repayments - loans issued
      summary.netPosition =
        summary.totalContributions +
        summary.totalJoiningFees +
        summary.totalLoanRepayments +
        summary.totalEmergencyContributions +
        summary.totalLateFees +
        summary.totalCashFees -
        summary.totalLoansIssued;

      return summary;
    },
    enabled: !!memberUserId || memberUserId === undefined,
    refetchInterval: 30000,
  });
}
