import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/constants';
import { RecordRepaymentDialog } from '@/components/loans/RecordRepaymentDialog';
import { RepaymentHistory } from '@/components/loans/RepaymentHistory';
import type { PersonalLoanWithProfile } from '@/hooks/usePersonalLoanBoard';
import {
  CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, AlertTriangle, Calendar, CheckCircle, History
} from 'lucide-react';

interface Props {
  loan: PersonalLoanWithProfile;
  userId: string;
  processingId: string | null;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDisburse: (id: string) => void;
  onRepaymentSuccess: () => void;
  refreshTrigger: number;
}

export function PersonalLoanCard({
  loan, userId, processingId, isAdmin,
  onApprove, onReject, onDisburse,
  onRepaymentSuccess, refreshTrigger,
}: Props) {
  const [rejectReason, setRejectReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const isProcessing = processingId === loan.id;
  const exceedsLimit = Number(loan.amount) > loan.eligible_amount;

  const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && Number(loan.outstanding_balance) > 0;

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-3.5 space-y-2">
        {/* Member Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base truncate text-foreground">
              {loan.profile?.full_name || 'Unknown'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(Number(loan.amount))}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatDate(loan.requested_at)}</span>
            </div>
          </div>
          <StatusBadge status={loan.status} variant="loan" className="text-xs font-semibold px-3 py-1" />
        </div>


        {/* Admin-only: Financial Analysis */}
        {isAdmin && (
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Requested</span>
            <span className="font-semibold text-right">{formatCurrency(Number(loan.amount))}</span>

            <span className="text-muted-foreground">Limit</span>
            <span className="text-right">{formatCurrency(loan.personal_loan_limit)}</span>

            <span className="text-muted-foreground">Existing Debt</span>
            <span className={`text-right ${loan.existing_outstanding > 0 ? 'text-destructive font-medium' : ''}`}>
              {formatCurrency(loan.existing_outstanding)}
            </span>

            <span className="text-muted-foreground">Eligible</span>
            <span className={`text-right text-sm font-bold ${exceedsLimit ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(loan.eligible_amount)}
            </span>
          </div>
        )}

        {/* Exceeds limit warning (admin only) */}
        {isAdmin && exceedsLimit && !['repaid', 'rejected'].includes(loan.status) && (
          <div className="flex items-center gap-1 p-1.5 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-[10px] text-destructive">Exceeds eligible limit</span>
          </div>
        )}

        {/* Purpose tag (admin only) */}
        {isAdmin && loan.reason && (
          <div>
            <Badge variant="secondary" className="text-[10px] font-normal">
              Purpose: {loan.reason}
            </Badge>
          </div>
        )}

        {/* Contribution status (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-1 text-[11px]">
            {loan.contribution_status === 'paid' ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            )}
            <span className={loan.contribution_status === 'paid' ? 'text-success font-medium' : 'text-warning font-medium'}>
              {loan.contribution_status === 'paid' ? 'Contributions up to date' : 'Contributions pending'}
            </span>
          </div>
        )}

        {/* Loan Summary - visible to all */}
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs border-t pt-2">
          <span className="text-muted-foreground">Principal</span>
          <span className="text-right">{formatCurrency(Number(loan.amount))}</span>

          <span className="text-muted-foreground">Interest ({loan.interest_rate_percent ?? 0}%)</span>
          <span className="text-right">{formatCurrency(Number(loan.interest_amount ?? 0))}</span>

          <span className="text-muted-foreground font-medium">Total Repayable</span>
          <span className="text-right font-semibold">{formatCurrency(Number(loan.total_repayable ?? 0))}</span>

          {loan.due_date && (
            <>
              <span className="text-muted-foreground">Deadline</span>
              <span className={`text-right flex items-center justify-end gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                <Calendar className="h-3 w-3" />
                {formatDate(loan.due_date)}
              </span>
            </>
          )}

          {Number(loan.outstanding_balance) > 0 && (
            <>
              <span className="text-muted-foreground font-medium">Outstanding</span>
              <span className="font-bold text-right text-accent">
                {formatCurrency(Number(loan.outstanding_balance))}
              </span>
            </>
          )}

          {loan.status === 'repaid' && (
            <>
              <span className="text-muted-foreground font-medium">Outstanding</span>
              <span className="font-bold text-right text-success">R0.00</span>
            </>
          )}
        </div>

        {/* Overdue warning */}
        {isOverdue && (
          <div className="flex items-center gap-1 p-1.5 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
            <span className="text-[10px] text-destructive font-medium">Overdue</span>
          </div>
        )}

        {/* Rejection reason */}
        {loan.status === 'rejected' && loan.rejection_reason && (
          <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
            <p className="text-[10px] text-destructive"><span className="font-medium">Reason:</span> {loan.rejection_reason}</p>
          </div>
        )}

        {/* Last repayment */}
        {loan.last_repayment_date && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Last repayment: {formatDate(loan.last_repayment_date)}</span>
          </div>
        )}

        {/* Actions */}
        {loan.status === 'requested' && isAdmin && (
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
          </div>
        )}

        {loan.status === 'approved' && Number(loan.outstanding_balance) > 0 && isAdmin && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex flex-col gap-2">
              <RecordRepaymentDialog loanId={loan.id} outstandingBalance={Number(loan.outstanding_balance)} memberName={loan.profile?.full_name || 'Unknown'} onSuccess={onRepaymentSuccess} userId={userId} interestAmount={loan.interest_amount} />
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide History</> : <><History className="h-3 w-3 mr-1" /> View History</>}
              </Button>
            </div>
            {isExpanded && <RepaymentHistory loanId={loan.id} refreshTrigger={refreshTrigger} />}
          </div>
        )}

        {(loan.status === 'repaid' || (loan.status === 'rejected')) && isAdmin && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide History</> : <><History className="h-3 w-3 mr-1" /> View History</>}
            </Button>
            {isExpanded && <RepaymentHistory loanId={loan.id} refreshTrigger={refreshTrigger} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
