import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getPersonalLoanMax } from '@/lib/constants';

export interface PersonalLoanWithProfile {
  id: string;
  member_user_id: string;
  amount: number;
  reason: string | null;
  repayment_plan: string | null;
  repayment_period: string | null;
  requested_at: string;
  status: string;
  outstanding_balance: number;
  interest_amount: number | null;
  interest_rate_percent: number | null;
  total_repayable: number | null;
  locked_by: string | null;
  locked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  due_date: string | null;
  profile: { full_name: string; membership_slots: number } | null;
  locker_name?: string;
  last_repayment_date?: string | null;
  existing_outstanding: number;
  eligible_amount: number;
  personal_loan_limit: number;
  contribution_status: 'paid' | 'unpaid' | 'unknown';
}

export interface PersonalLoanActivity {
  id: string;
  loan_id: string;
  actor_user_id: string;
  action: string;
  details: string | null;
  created_at: string;
  actor_name?: string;
}

export interface PersonalLoanMetrics {
  pendingRequests: number;
  approvedToday: number;
  repaymentsToday: number;
  totalOutstanding: number;
}

const LOCK_EXPIRY_MS = 3 * 60 * 1000;

function isLockExpired(lockedAt: string | null): boolean {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_EXPIRY_MS;
}

export function usePersonalLoanBoard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<PersonalLoanWithProfile[]>([]);
  const [activities, setActivities] = useState<PersonalLoanActivity[]>([]);
  const [metrics, setMetrics] = useState<PersonalLoanMetrics>({
    pendingRequests: 0, approvedToday: 0, repaymentsToday: 0, totalOutstanding: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    await Promise.all([fetchLoans(), fetchActivities(), fetchMetrics()]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('personal-loan-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => { fetchLoans(); fetchMetrics(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_loan_activity' }, () => { fetchActivities(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_repayments' }, () => { fetchLoans(); fetchMetrics(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('type', 'personal')
      .in('status', ['requested', 'under_review', 'approved', 'disbursed', 'pending', 'repaid', 'rejected'])
      .order('requested_at', { ascending: true });

    if (error) { console.error('Error fetching personal loans:', error); return; }

    const enriched = await Promise.all(
      (data || []).map(async (loan) => {
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('full_name, membership_slots')
          .eq('user_id', loan.member_user_id)
          .maybeSingle();

        const slots = profile?.membership_slots || 1;
        const personalLoanLimit = getPersonalLoanMax(slots);

        const { data: existingLoans } = await supabase
          .from('loans')
          .select('outstanding_balance')
          .eq('member_user_id', loan.member_user_id)
          .eq('type', 'personal')
          .in('status', ['approved', 'disbursed'])
          .neq('id', loan.id);

        const existingOutstanding = (existingLoans || []).reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
        const eligibleAmount = Math.max(0, personalLoanLimit - existingOutstanding);

        const { data: lastRepayment } = await supabase
          .from('loan_repayments')
          .select('paid_at')
          .eq('loan_id', loan.id)
          .order('paid_at', { ascending: false })
          .limit(1);

        let lockerName: string | undefined;
        if (loan.locked_by && !isLockExpired(loan.locked_at)) {
          const { data: lockerProfile } = await supabase
            .from('member_profiles').select('full_name').eq('user_id', loan.locked_by).maybeSingle();
          lockerName = lockerProfile?.full_name || 'Admin';
        }

        let contributionStatus: 'paid' | 'unpaid' | 'unknown' = 'unknown';
        const { data: recentPayment } = await supabase
          .from('payments').select('status').eq('member_user_id', loan.member_user_id)
          .eq('status', 'verified').order('submitted_at', { ascending: false }).limit(1);
        contributionStatus = recentPayment && recentPayment.length > 0 ? 'paid' : 'unpaid';

        return {
          ...loan,
          status: loan.status === 'pending' ? 'requested' : loan.status, // normalize
          profile: profile ? { full_name: profile.full_name, membership_slots: slots } : null,
          locker_name: lockerName,
          last_repayment_date: lastRepayment?.[0]?.paid_at || null,
          existing_outstanding: existingOutstanding,
          eligible_amount: eligibleAmount,
          personal_loan_limit: personalLoanLimit,
          contribution_status: contributionStatus,
        } as PersonalLoanWithProfile;
      })
    );

    setLoans(enriched);
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('personal_loan_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return;

    const withNames = await Promise.all(
      (data || []).map(async (a: any) => {
        const { data: profile } = await supabase
          .from('member_profiles').select('full_name').eq('user_id', a.actor_user_id).maybeSingle();
        return { ...a, actor_name: profile?.full_name || 'Admin' } as PersonalLoanActivity;
      })
    );
    setActivities(withNames);
  };

  const fetchMetrics = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [requested, approvedToday, activeLoans, repaymentsToday] = await Promise.all([
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('type', 'personal').in('status', ['requested', 'pending']),
      supabase.from('loans').select('*', { count: 'exact', head: true }).eq('type', 'personal').eq('status', 'approved').gte('approved_at', today),
      supabase.from('loans').select('outstanding_balance').eq('type', 'personal').in('status', ['approved', 'disbursed']),
      supabase.from('loan_repayments').select('amount').gte('paid_at', today),
    ]);

    const totalOutstanding = (activeLoans.data || []).reduce((s, l) => s + Number(l.outstanding_balance), 0);
    setMetrics({
      pendingRequests: requested.count || 0,
      approvedToday: approvedToday.count || 0,
      repaymentsToday: (repaymentsToday.data || []).reduce((s, r) => s + Number(r.amount), 0),
      totalOutstanding,
    });
  };

  const logActivity = async (loanId: string, action: string, details?: string) => {
    if (!user) return;
    await supabase.from('personal_loan_activity').insert({
      loan_id: loanId, actor_user_id: user.id, action, details: details || null,
    });
  };

  const lockLoan = async (loanId: string) => {
    if (!user) return;
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    if (loan.locked_by && loan.locked_by !== user.id && !isLockExpired(loan.locked_at)) {
      toast({ title: 'Loan is locked', description: `Currently reviewed by ${loan.locker_name || 'another admin'}`, variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('loans')
      .update({ locked_by: user.id, locked_at: new Date().toISOString(), status: 'under_review' })
      .eq('id', loanId)
      .in('status', ['requested', 'under_review', 'pending']);

    if (error) { toast({ title: 'Lock failed', description: error.message, variant: 'destructive' }); return false; }
    await logActivity(loanId, 'loan_reviewed', 'Loan taken for review');
    fetchLoans();
    return true;
  };

  const unlockLoan = async (loanId: string) => {
    if (!user) return;
    await supabase.from('loans').update({ locked_by: null, locked_at: null, status: 'requested' }).eq('id', loanId).eq('locked_by', user.id);
    fetchLoans();
  };

  const approveLoan = async (loanId: string) => {
    if (!user || !loanId) return;
    setProcessingId(loanId);
    try {
      const loan = loans.find(l => l.id === loanId);
      if (loan && Number(loan.amount) > loan.eligible_amount) {
        toast({ title: 'Exceeds limit', description: `Requested amount exceeds eligible limit of R${loan.eligible_amount.toFixed(2)}`, variant: 'destructive' });
        return;
      }

      const { data: fundData } = await supabase.from('personal_loan_fund').select('current_balance').limit(1).maybeSingle();
      if (fundData && loan && Number(loan.amount) > Number(fundData.current_balance)) {
        toast({ title: 'Insufficient fund balance', description: 'Insufficient personal loan fund balance to approve this loan.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('loans').update({
        status: 'approved', approved_by: user.id, approved_at: new Date().toISOString(), locked_by: null, locked_at: null,
      }).eq('id', loanId);

      if (error) throw error;
      await logActivity(loanId, 'loan_approved', 'Loan approved');
      toast({ title: 'Personal loan approved' });
      fetchLoans();
    } catch (e: any) {
      toast({ title: 'Approval failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectLoan = async (loanId: string, reason: string) => {
    if (!user || !loanId) return;
    if (!reason.trim()) { toast({ title: 'Reason required', variant: 'destructive' }); return; }
    setProcessingId(loanId);
    try {
      const { error } = await supabase.from('loans').update({
        status: 'rejected', approved_by: user.id, approved_at: new Date().toISOString(),
        rejection_reason: reason.trim(), locked_by: null, locked_at: null,
      }).eq('id', loanId);
      if (error) throw error;
      await logActivity(loanId, 'loan_rejected', `Rejected: ${reason.trim()}`);
      toast({ title: 'Personal loan rejected' });
      fetchLoans();
    } catch (e: any) {
      toast({ title: 'Rejection failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const disburseLoan = async (loanId: string) => {
    if (!user) return;
    setProcessingId(loanId);
    try {
      const { error } = await supabase.from('loans').update({
        status: 'disbursed', disbursed_by: user.id, disbursed_at: new Date().toISOString(),
      }).eq('id', loanId);
      if (error) throw error;
      await logActivity(loanId, 'loan_disbursed', 'Loan disbursed to member');
      toast({ title: 'Loan marked as disbursed' });
      fetchLoans();
    } catch (e: any) {
      toast({ title: 'Disbursement failed', description: e.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const requested = loans.filter(l => l.status === 'requested');
  const underReview = loans.filter(l => l.status === 'under_review');
  const approved = loans.filter(l => ['approved', 'disbursed'].includes(l.status) && Number(l.outstanding_balance) > 0);
  const repaid = loans.filter(l => l.status === 'repaid');
  const rejected = loans.filter(l => l.status === 'rejected');

  return {
    loans, columns: { requested, underReview, approved, repaid, rejected },
    activities, metrics, isLoading, processingId,
    lockLoan, unlockLoan, approveLoan, rejectLoan, disburseLoan,
    isLockExpired, refreshLoans: fetchLoans, refreshAll: fetchAll,
  };
}
