import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Fuel, CheckCircle2, XCircle, Loader2, Clock, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { RecordRepaymentDialog } from '@/components/loans/RecordRepaymentDialog';
import { RepaymentHistory } from '@/components/loans/RepaymentHistory';

interface LoanWithProfile {
  id: string;
  member_user_id: string;
  type: string;
  amount: number;
  reason: string | null;
  repayment_plan: string | null;
  requested_at: string;
  status: string;
  outstanding_balance: number;
  interest_amount: number | null;
  profile: { full_name: string } | null;
}

export default function AdminPetrolLoans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<LoanWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('type', 'petrol')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching petrol loans:', error);
    } else {
      const loansWithProfiles = await Promise.all(
        (data || []).map(async (loan) => {
          const { data: profile } = await supabase
            .from('member_profiles')
            .select('full_name')
            .eq('user_id', loan.member_user_id)
            .maybeSingle();
          return { ...loan, profile };
        })
      );
      setLoans(loansWithProfiles as LoanWithProfile[]);
    }
    setIsLoading(false);
  };

  const handleApprove = async (loanId: string) => {
    if (!user) return;
    setProcessingId(loanId);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', loanId);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'petrol_loan_approved',
        entity_type: 'loan',
        entity_id: loanId,
        actor_user_id: user.id,
      });

      toast({ title: 'Petrol loan approved', description: 'The member will be notified' });
      fetchLoans();
    } catch (error: any) {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (loanId: string) => {
    if (!user || !rejectReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a rejection reason', variant: 'destructive' });
      return;
    }
    setProcessingId(loanId);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: 'rejected', approved_by: user.id, approved_at: new Date().toISOString(), rejection_reason: rejectReason.trim() })
        .eq('id', loanId);
      if (error) throw error;
      toast({ title: 'Petrol loan rejected', description: 'The member will be notified' });
      setRejectReason('');
      fetchLoans();
    } catch (error: any) {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'pending');
  const activeLoans = loans.filter(l => l.status === 'approved' && Number(l.outstanding_balance) > 0);
  const historyLoans = loans.filter(l => l.status !== 'pending' && !(l.status === 'approved' && Number(l.outstanding_balance) > 0));

  const handleRepaymentSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchLoans();
  };

  const renderLoanCard = (loan: LoanWithProfile, showActions = false, showRepayment = false) => {
    const isExpanded = expandedLoanId === loan.id;
    return (
      <Card key={loan.id} className="animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">{loan.profile?.full_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">Petrol loan • {formatDate(loan.requested_at)}</p>
              </div>
            </div>
            <StatusBadge status={loan.status} variant="loan" />
          </div>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(Number(loan.amount))}</span>
            </div>
            {loan.status === 'approved' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-accent">{formatCurrency(Number(loan.outstanding_balance))}</span>
              </div>
            )}
          </div>
          {loan.reason && <p className="text-xs text-muted-foreground mb-3 italic">"{loan.reason}"</p>}
          {showActions && loan.status === 'pending' && (
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reject Petrol Loan</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                    <Button variant="destructive" className="w-full" onClick={() => handleReject(loan.id)} disabled={processingId === loan.id}>
                      {processingId === loan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 flex-1" onClick={() => handleApprove(loan.id)} disabled={processingId === loan.id}>
                {processingId === loan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>}
              </Button>
            </div>
          )}
          {showRepayment && loan.status === 'approved' && Number(loan.outstanding_balance) > 0 && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-muted-foreground p-0 h-auto" onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}>
                  {isExpanded ? <><ChevronUp className="h-4 w-4 mr-1" /> Hide History</> : <><ChevronDown className="h-4 w-4 mr-1" /> View History</>}
                </Button>
                <RecordRepaymentDialog loanId={loan.id} outstandingBalance={Number(loan.outstanding_balance)} memberName={loan.profile?.full_name || 'Unknown'} onSuccess={handleRepaymentSuccess} userId={user?.id || ''} interestAmount={loan.interest_amount} />
              </div>
              {isExpanded && <RepaymentHistory loanId={loan.id} refreshTrigger={refreshTrigger} />}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Petrol Loans" subtitle="Manage petrol loan requests" showBack />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="pending" className="flex-1">Pending {pendingLoans.length > 0 && `(${pendingLoans.length})`}</TabsTrigger>
          <TabsTrigger value="active" className="flex-1">Active {activeLoans.length > 0 && `(${activeLoans.length})`}</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3">
          {pendingLoans.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No pending requests</h3><p className="text-sm text-muted-foreground">All petrol loan requests have been processed</p></CardContent></Card>
          ) : pendingLoans.map(loan => renderLoanCard(loan, true))}
        </TabsContent>
        <TabsContent value="active" className="space-y-3">
          {activeLoans.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No active petrol loans</h3><p className="text-sm text-muted-foreground">All petrol loans have been fully repaid</p></CardContent></Card>
          ) : activeLoans.map(loan => renderLoanCard(loan, false, true))}
        </TabsContent>
        <TabsContent value="history" className="space-y-3">
          {historyLoans.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No loan history</h3><p className="text-sm text-muted-foreground">Processed petrol loans will appear here</p></CardContent></Card>
          ) : historyLoans.map(loan => renderLoanCard(loan, false))}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
