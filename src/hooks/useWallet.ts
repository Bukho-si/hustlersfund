import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberWallet {
  id: string;
  member_user_id: string;
  contribution_balance: number;
  petrol_loan_balance: number;
  personal_loan_balance: number;
  emergency_contributions_total: number;
  joining_fee_balance: number;
  updated_at: string;
}

export type WalletTransactionType =
  | 'joining_fee_payment'
  | 'weekly_contribution'
  | 'petrol_loan_issued'
  | 'petrol_loan_repayment'
  | 'personal_loan_issued'
  | 'personal_loan_repayment'
  | 'funeral_contribution'
  | 'accident_contribution'
  | 'emergency_contribution'
  | 'late_fee'
  | 'cash_fee';

export interface WalletTransaction {
  id: string;
  member_user_id: string;
  transaction_type: WalletTransactionType;
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
  memberName?: string;
}

const TRANSACTION_LABELS: Record<WalletTransactionType, string> = {
  joining_fee_payment: 'Joining Fee',
  weekly_contribution: 'Weekly Contribution',
  petrol_loan_issued: 'Petrol Loan Issued',
  petrol_loan_repayment: 'Petrol Loan Repayment',
  personal_loan_issued: 'Personal Loan Issued',
  personal_loan_repayment: 'Personal Loan Repayment',
  funeral_contribution: 'Funeral Contribution',
  accident_contribution: 'Accident Contribution',
  emergency_contribution: 'Emergency Contribution',
  late_fee: 'Late Fee',
  cash_fee: 'Cash/ATM Fee',
};

export function getWalletTransactionLabel(type: WalletTransactionType): string {
  return TRANSACTION_LABELS[type] || type;
}

export function isWalletDebitTransaction(type: WalletTransactionType): boolean {
  return type === 'petrol_loan_issued' || type === 'personal_loan_issued';
}

export function useMyWallet(memberUserId?: string) {
  return useQuery({
    queryKey: ['member-wallet', memberUserId],
    queryFn: async (): Promise<MemberWallet | null> => {
      if (!memberUserId) return null;
      const { data, error } = await (supabase as any)
        .from('member_wallets')
        .select('*')
        .eq('member_user_id', memberUserId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const d = data as any;
      return {
        id: d.id,
        member_user_id: d.member_user_id,
        contribution_balance: Number(d.contribution_balance),
        petrol_loan_balance: Number(d.petrol_loan_balance),
        personal_loan_balance: Number(d.personal_loan_balance),
        emergency_contributions_total: Number(d.emergency_contributions_total),
        joining_fee_balance: Number(d.joining_fee_balance),
        updated_at: d.updated_at,
      } as MemberWallet;
    },
    enabled: !!memberUserId,
    refetchInterval: 30000,
  });
}

export function useWalletTransactions(options?: {
  memberUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: WalletTransactionType;
  limit?: number;
}) {
  const { memberUserId, dateFrom, dateTo, transactionType, limit = 100 } = options || {};

  return useQuery({
    queryKey: ['wallet-transactions', memberUserId, dateFrom, dateTo, transactionType, limit],
    queryFn: async (): Promise<WalletTransaction[]> => {
      let query = (supabase as any)
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (memberUserId) query = query.eq('member_user_id', memberUserId);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo);
      if (transactionType) query = query.eq('transaction_type', transactionType);

      const { data, error } = await query;
      if (error) throw error;

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

export function useAllWallets() {
  return useQuery({
    queryKey: ['all-wallets'],
    queryFn: async (): Promise<(MemberWallet & { memberName: string })[]> => {
      const { data, error } = await (supabase as any)
        .from('member_wallets')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const memberIds = data.map((w: any) => w.member_user_id);
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      return data.map((w: any) => ({
        ...w,
        contribution_balance: Number(w.contribution_balance),
        petrol_loan_balance: Number(w.petrol_loan_balance),
        personal_loan_balance: Number(w.personal_loan_balance),
        emergency_contributions_total: Number(w.emergency_contributions_total),
        joining_fee_balance: Number(w.joining_fee_balance),
        memberName: nameMap.get(w.member_user_id) || 'Unknown',
      }));
    },
    refetchInterval: 30000,
  });
}

export interface WalletSummary {
  totalContributions: number;
  totalJoiningFees: number;
  totalPetrolLoansOutstanding: number;
  totalPersonalLoansOutstanding: number;
  totalEmergencyContributions: number;
  netPosition: number;
}

export function useWalletSummary() {
  return useQuery({
    queryKey: ['wallet-summary'],
    queryFn: async (): Promise<WalletSummary> => {
      const { data, error } = await supabase
        .from('member_wallets' as any)
        .select('contribution_balance, petrol_loan_balance, personal_loan_balance, emergency_contributions_total, joining_fee_balance');
      if (error) throw error;

      const summary: WalletSummary = {
        totalContributions: 0,
        totalJoiningFees: 0,
        totalPetrolLoansOutstanding: 0,
        totalPersonalLoansOutstanding: 0,
        totalEmergencyContributions: 0,
        netPosition: 0,
      };

      data?.forEach((w: any) => {
        summary.totalContributions += Number(w.contribution_balance);
        summary.totalJoiningFees += Number(w.joining_fee_balance);
        summary.totalPetrolLoansOutstanding += Number(w.petrol_loan_balance);
        summary.totalPersonalLoansOutstanding += Number(w.personal_loan_balance);
        summary.totalEmergencyContributions += Number(w.emergency_contributions_total);
      });

      summary.netPosition =
        summary.totalContributions +
        summary.totalJoiningFees +
        summary.totalEmergencyContributions -
        summary.totalPetrolLoansOutstanding -
        summary.totalPersonalLoansOutstanding;

      return summary;
    },
    refetchInterval: 30000,
  });
}
