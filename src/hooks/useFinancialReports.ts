import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, format, startOfMonth, endOfMonth } from 'date-fns';

export interface FinancialSummary {
  totalPoolBalance: number;
  totalContributions: number;
  totalLoansActive: number;
  totalInterestEarned: number;
  totalEmergencyDues: number;
  collectionRate: number;
  activeMembers: number;
  pendingPayments: number;
}

export interface WeeklyContribution {
  week: string;
  amount: number;
  count: number;
}

export interface LoanDistribution {
  type: string;
  amount: number;
  count: number;
}

export interface RecentTransaction {
  id: string;
  type: 'payment' | 'loan' | 'repayment';
  memberName: string;
  amount: number;
  status: string;
  date: string;
}

export interface MemberBalance {
  id: string;
  fullName: string;
  totalContributions: number;
  outstandingLoans: number;
  emergencyDues: number;
  netPosition: number;
}

const POLLING_INTERVAL = 30000; // 30 seconds

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async (): Promise<FinancialSummary> => {
      // Fetch verified payments total
      const { data: payments } = await supabase
        .from('payments')
        .select('total_amount, status')
        .eq('status', 'verified');

      const totalContributions = payments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;

      // Fetch all payments for collection rate
      const { count: totalPaymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedPaymentsCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'verified');

      const collectionRate = totalPaymentsCount ? (verifiedPaymentsCount || 0) / totalPaymentsCount * 100 : 0;

      // Fetch active loans
      const { data: loans } = await supabase
        .from('loans')
        .select('amount, outstanding_balance, interest_amount, status')
        .eq('status', 'approved');

      const totalLoansActive = loans?.reduce((sum, l) => sum + Number(l.outstanding_balance), 0) || 0;
      const totalInterestEarned = loans?.reduce((sum, l) => sum + Number(l.interest_amount || 0), 0) || 0;

      // Fetch emergency dues
      const { data: emergencyDues } = await supabase
        .from('emergency_dues')
        .select('amount_due, amount_paid')
        .eq('status', 'unpaid');

      const totalEmergencyDues = emergencyDues?.reduce(
        (sum, d) => sum + (Number(d.amount_due) - Number(d.amount_paid)),
        0
      ) || 0;

      // Active members
      const { count: activeMembers } = await supabase
        .from('member_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Pending payments
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'pending_verification']);

      // Calculate pool balance (contributions - disbursed loans)
      const { data: allLoans } = await supabase
        .from('loans')
        .select('amount')
        .eq('status', 'approved');

      const totalDisbursed = allLoans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0;
      const totalPoolBalance = totalContributions - totalDisbursed + totalLoansActive;

      return {
        totalPoolBalance,
        totalContributions,
        totalLoansActive,
        totalInterestEarned,
        totalEmergencyDues,
        collectionRate,
        activeMembers: activeMembers || 0,
        pendingPayments: pendingPayments || 0,
      };
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useWeeklyContributions() {
  return useQuery({
    queryKey: ['weekly-contributions'],
    queryFn: async (): Promise<WeeklyContribution[]> => {
      const weeks: WeeklyContribution[] = [];
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        
        const { data: payments } = await supabase
          .from('payments')
          .select('total_amount')
          .eq('status', 'verified')
          .gte('submitted_at', weekStart.toISOString())
          .lte('submitted_at', weekEnd.toISOString());

        weeks.push({
          week: format(weekStart, 'MMM d'),
          amount: payments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
          count: payments?.length || 0,
        });
      }
      
      return weeks;
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useLoanDistribution() {
  return useQuery({
    queryKey: ['loan-distribution'],
    queryFn: async (): Promise<LoanDistribution[]> => {
      const { data: loans } = await supabase
        .from('loans')
        .select('type, amount')
        .eq('status', 'approved');

      const distribution: Record<string, { amount: number; count: number }> = {};
      
      loans?.forEach((loan) => {
        const type = loan.type || 'other';
        if (!distribution[type]) {
          distribution[type] = { amount: 0, count: 0 };
        }
        distribution[type].amount += Number(loan.amount);
        distribution[type].count += 1;
      });

      return Object.entries(distribution).map(([type, data]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        amount: data.amount,
        count: data.count,
      }));
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useRecentTransactions(limit = 20) {
  return useQuery({
    queryKey: ['recent-transactions', limit],
    queryFn: async (): Promise<RecentTransaction[]> => {
      const transactions: RecentTransaction[] = [];

      // Fetch recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          total_amount,
          status,
          submitted_at,
          member_user_id
        `)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      // Fetch member profiles for names
      const memberIds = [...new Set(payments?.map(p => p.member_user_id) || [])];
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      payments?.forEach((payment) => {
        transactions.push({
          id: payment.id,
          type: 'payment',
          memberName: profileMap.get(payment.member_user_id) || 'Unknown',
          amount: Number(payment.total_amount),
          status: payment.status,
          date: payment.submitted_at,
        });
      });

      // Fetch recent loans
      const { data: loans } = await supabase
        .from('loans')
        .select(`
          id,
          amount,
          status,
          requested_at,
          member_user_id
        `)
        .order('requested_at', { ascending: false })
        .limit(limit);

      const loanMemberIds = [...new Set(loans?.map(l => l.member_user_id) || [])];
      const { data: loanProfiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', loanMemberIds);

      const loanProfileMap = new Map(loanProfiles?.map(p => [p.user_id, p.full_name]) || []);

      loans?.forEach((loan) => {
        transactions.push({
          id: loan.id,
          type: 'loan',
          memberName: loanProfileMap.get(loan.member_user_id) || 'Unknown',
          amount: Number(loan.amount),
          status: loan.status,
          date: loan.requested_at,
        });
      });

      // Sort by date
      return transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useMemberBalances() {
  return useQuery({
    queryKey: ['member-balances'],
    queryFn: async (): Promise<MemberBalance[]> => {
      const { data: members } = await supabase
        .from('member_profiles')
        .select('id, user_id, full_name')
        .eq('status', 'active');

      if (!members) return [];

      const balances: MemberBalance[] = [];

      for (const member of members) {
        // Get verified payments
        const { data: payments } = await supabase
          .from('payments')
          .select('total_amount')
          .eq('member_user_id', member.user_id)
          .eq('status', 'verified');

        const totalContributions = payments?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;

        // Get outstanding loans
        const { data: loans } = await supabase
          .from('loans')
          .select('outstanding_balance')
          .eq('member_user_id', member.user_id)
          .eq('status', 'approved');

        const outstandingLoans = loans?.reduce((sum, l) => sum + Number(l.outstanding_balance), 0) || 0;

        // Get emergency dues
        const { data: dues } = await supabase
          .from('emergency_dues')
          .select('amount_due, amount_paid')
          .eq('member_user_id', member.user_id)
          .eq('status', 'unpaid');

        const emergencyDues = dues?.reduce(
          (sum, d) => sum + (Number(d.amount_due) - Number(d.amount_paid)),
          0
        ) || 0;

        balances.push({
          id: member.id,
          fullName: member.full_name,
          totalContributions,
          outstandingLoans,
          emergencyDues,
          netPosition: totalContributions - outstandingLoans - emergencyDues,
        });
      }

      return balances.sort((a, b) => b.netPosition - a.netPosition);
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function usePaymentsLedger() {
  return useQuery({
    queryKey: ['payments-ledger'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(100);

      if (!payments) return [];

      const memberIds = [...new Set(payments.map(p => p.member_user_id))];
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return payments.map(p => ({
        ...p,
        memberName: profileMap.get(p.member_user_id) || 'Unknown',
      }));
    },
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useLoansLedger() {
  return useQuery({
    queryKey: ['loans-ledger'],
    queryFn: async () => {
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100);

      if (!loans) return [];

      const memberIds = [...new Set(loans.map(l => l.member_user_id))];
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return loans.map(l => ({
        ...l,
        memberName: profileMap.get(l.member_user_id) || 'Unknown',
      }));
    },
    refetchInterval: POLLING_INTERVAL,
  });
}
