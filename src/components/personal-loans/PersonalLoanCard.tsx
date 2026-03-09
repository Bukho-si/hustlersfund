import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/constants';
import { RecordRepaymentDialog } from '@/components/loans/RecordRepaymentDialog';
import { RepaymentHistory } from '@/components/loans/RepaymentHistory';
import type { PersonalLoanWithProfile } from '@/hooks/usePersonalLoanBoard';
import {
  DollarSign, Lock, Eye, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, Send, AlertTriangle, Users, Calendar
} from 'lucide-react';

interface Props {
  loan: PersonalLoanWithProfile;
  userId: string;
  processingId: string | null;
  onLock: (id: string) => Promise<boolean | undefined>;
  onUnlock: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDisburse: (id: string) => void;
  onRepaymentSuccess: () => void;
  refreshTrigger: number;
}

export function PersonalLoanCard({
  loan, userId, processingId,
  onLock, onUnlock, onApprove, onReject, onDisburse,
  onRepaymentSuccess, refreshTrigger,
}: Props) {
  const [rejectReason, setRejectReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const isProcessing = processingId === loan.id;
  const isLockedByOther = loan.locked_by && loan.locked_by !== userId && loan.locker_name;
  const exceedsLimit = Number(loan.amount) > loan.eligible_amount;

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{loan.profile?.full_name || 'Unknown'}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(loan.requested_at)}</p>
            </div>
          </div>
          <StatusBadge status={loan.status} variant="loan" className="text-[10px]" />
        </div>

        {isLockedByOther && (
          <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded bg-warning/10 border border-warning/20">
            <Lock className="h-3 w-3 text-warning" />
            <span className="text-[10px] text-warning font-medium">Reviewed by {loan.locker_name}</span>
          </div>
        )}

        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Requested</span><span className="font-semibold">{formatCurrency(Number(loan.amount))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground"><Users className="h-3 w-3 inline mr-0.5" />Slots</span><span>{loan.profile?.membership_slots || 1}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Limit</span><span>{formatCurrency(loan.personal_loan_limit)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Existing debt</span><span className={loan.existing_outstanding > 0 ? 'text-destructive font-medium' : ''}>{formatCurrency(loan.existing_outstanding)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Eligible</span><span className={exceedsLimit ? 'text-destructive font-bold' : 'text-success font-medium'}>{formatCurrency(loan.eligible_amount)}</span></div>
          {(loan.status === 'disbursed' || loan.status === 'approved') && Number(loan.outstanding_balance) > 0 && (
            <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Outstanding</span><span className="font-semibold text-accent">{formatCurrency(Number(loan.outstanding_balance))}</span></div>
          )}
        </div>

        {exceedsLimit && !['disbursed', 'approved'].includes(loan.status) && (
          <div className="flex items-center gap-1 p-1.5 rounded bg-destructive/10 border border-destructive/20 mb-2">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" /><span className="text-[10px] text-destructive">Exceeds eligible limit</span>
          </div>
        )}

        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-muted-foreground">Contributions:</span>
          <span className={`text-[10px] font-medium ${loan.contribution_status === 'paid' ? 'text-success' : 'text-warning'}`}>
            {loan.contribution_status === 'paid' ? 'Up to date' : 'Pending'}
          </span>
        </div>

        {loan.last_repayment_date && (
          <div className="flex items-center gap-1 mb-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Last repayment: {formatDate(loan.last_repayment_date)}</span>
          </div>
        )}

        {loan.reason && <p className="text-[10px] text-muted-foreground mb-2 italic truncate" title={loan.reason}>"{loan.reason}"</p>}

        {loan.status === 'requested' && !isLockedByOther && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => onLock(loan.id)} disabled={isProcessing}>
            <Eye className="h-3 w-3 mr-1" /> Review
          </Button>
        )}

        {loan.status === 'under_review' && loan.locked_by === userId && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 flex-1">
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reject Personal Loan</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                    <Button variant="destructive" className="w-full" onClick={() => { onReject(loan.id, rejectReason); setRejectReason(''); }} disabled={isProcessing || !rejectReason.trim()}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 flex-1 text-xs" onClick={() => onApprove(loan.id)} disabled={isProcessing || exceedsLimit}>
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</>}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => onUnlock(loan.id)}>Release Lock</Button>
          </div>
        )}

        {loan.status === 'approved' && Number(loan.outstanding_balance) > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="text-muted-foreground p-0 h-auto text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide</> : <><ChevronDown className="h-3 w-3 mr-1" /> History</>}
              </Button>
              <RecordRepaymentDialog loanId={loan.id} outstandingBalance={Number(loan.outstanding_balance)} memberName={loan.profile?.full_name || 'Unknown'} onSuccess={onRepaymentSuccess} userId={userId} interestAmount={loan.interest_amount} />
            </div>
            {isExpanded && <RepaymentHistory loanId={loan.id} refreshTrigger={refreshTrigger} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
