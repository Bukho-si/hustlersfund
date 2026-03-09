import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { PetrolLoanWithProfile } from '@/hooks/usePetrolLoanBoard';
import {
  CheckCircle2, XCircle, Loader2, ArrowUpDown, AlertTriangle, Shield
} from 'lucide-react';

type SortKey = 'oldest' | 'newest' | 'highest' | 'risk';
type Decision = 'approve' | 'reject' | null;

interface BatchItem {
  loanId: string;
  decision: Decision;
  rejectReason: string;
}

interface Props {
  loans: PetrolLoanWithProfile[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  processingId: string | null;
  fundBalance: number;
}

function getRiskLevel(loan: PetrolLoanWithProfile): 'green' | 'yellow' | 'red' {
  if (loan.existing_outstanding > 0 && loan.eligible_amount <= 0) return 'red';
  if (loan.existing_outstanding > 0) return 'yellow';
  if (loan.contribution_status === 'unpaid') return 'yellow';
  return 'green';
}

function getRiskLabel(level: 'green' | 'yellow' | 'red') {
  switch (level) {
    case 'green': return 'Safe';
    case 'yellow': return 'Caution';
    case 'red': return 'High Risk';
  }
}

function getRiskColor(level: 'green' | 'yellow' | 'red') {
  switch (level) {
    case 'green': return 'bg-success/10 text-success border-success/20';
    case 'yellow': return 'bg-warning/10 text-warning border-warning/20';
    case 'red': return 'bg-destructive/10 text-destructive border-destructive/20';
  }
}

export function PetrolBatchReview({ loans, onApprove, onReject, processingId, fundBalance }: Props) {
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<SortKey>('oldest');
  const [batch, setBatch] = useState<Map<string, BatchItem>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectDialogLoan, setRejectDialogLoan] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const sorted = [...loans].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
      case 'highest': return Number(b.amount) - Number(a.amount);
      case 'risk': {
        const order = { red: 0, yellow: 1, green: 2 };
        return order[getRiskLevel(a)] - order[getRiskLevel(b)];
      }
      default: return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
    }
  }).slice(0, 10);

  const setDecision = (loanId: string, decision: Decision, reason = '') => {
    const updated = new Map(batch);
    if (decision === null) {
      updated.delete(loanId);
    } else {
      updated.set(loanId, { loanId, decision, rejectReason: reason });
    }
    setBatch(updated);
  };

  const handleRejectConfirm = () => {
    if (rejectDialogLoan && rejectReason.trim()) {
      setDecision(rejectDialogLoan, 'reject', rejectReason.trim());
      setRejectDialogLoan(null);
      setRejectReason('');
    }
  };

  const submitBatch = async () => {
    if (batch.size === 0) {
      toast({ title: 'No decisions made', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    for (const [, item] of batch) {
      if (item.decision === 'approve') {
        const loan = loans.find(l => l.id === item.loanId);
        if (loan && Number(loan.amount) > fundBalance) {
          toast({
            title: 'Insufficient fund balance',
            description: `Cannot approve loan for ${loan.profile?.full_name}`,
            variant: 'destructive',
          });
          continue;
        }
        onApprove(item.loanId);
      } else if (item.decision === 'reject') {
        onReject(item.loanId, item.rejectReason);
      }
      // Small delay between operations
      await new Promise(r => setTimeout(r, 300));
    }
    setBatch(new Map());
    setIsSubmitting(false);
    toast({ title: `Batch of ${batch.size} decisions submitted` });
  };

  const approveCount = [...batch.values()].filter(b => b.decision === 'approve').length;
  const rejectCount = [...batch.values()].filter(b => b.decision === 'reject').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Batch Review ({sorted.length} requests)
          </CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="highest">Highest Amount</SelectItem>
                <SelectItem value="risk">Risk Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Member</TableHead>
                <TableHead className="text-xs">Slots</TableHead>
                <TableHead className="text-xs">Requested</TableHead>
                <TableHead className="text-xs">Limit</TableHead>
                <TableHead className="text-xs">Outstanding</TableHead>
                <TableHead className="text-xs">Eligible</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                    No pending requests to review
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((loan) => {
                  const risk = getRiskLevel(loan);
                  const decision = batch.get(loan.id)?.decision || null;
                  const exceedsLimit = Number(loan.amount) > loan.eligible_amount;
                  const exceedsFund = Number(loan.amount) > fundBalance;

                  return (
                    <TableRow key={loan.id} className={decision === 'approve' ? 'bg-success/5' : decision === 'reject' ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs font-medium">{loan.profile?.full_name || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">{loan.profile?.membership_slots || 1}</TableCell>
                      <TableCell className="text-xs font-semibold">{formatCurrency(Number(loan.amount))}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(loan.petrol_loan_limit)}</TableCell>
                      <TableCell className={`text-xs ${loan.existing_outstanding > 0 ? 'text-destructive font-medium' : ''}`}>
                        {formatCurrency(loan.existing_outstanding)}
                      </TableCell>
                      <TableCell className={`text-xs ${exceedsLimit ? 'text-destructive font-bold' : 'text-success font-medium'}`}>
                        {formatCurrency(loan.eligible_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getRiskColor(risk)}`}>
                          {getRiskLabel(risk)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {decision ? (
                          <div className="flex items-center justify-end gap-1">
                            <Badge variant="outline" className={`text-[10px] ${decision === 'approve' ? 'text-success' : 'text-destructive'}`}>
                              {decision === 'approve' ? '✓ Approve' : '✗ Reject'}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground" onClick={() => setDecision(loan.id, null)}>
                              ×
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-success hover:text-success hover:bg-success/10"
                              onClick={() => setDecision(loan.id, 'approve')}
                              disabled={exceedsLimit || exceedsFund}
                              title={exceedsFund ? 'Insufficient fund balance' : exceedsLimit ? 'Exceeds limit' : ''}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setRejectDialogLoan(loan.id); setRejectReason(''); }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {batch.size > 0 && (
          <div className="p-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              {approveCount > 0 && <span className="text-success font-medium">{approveCount} approve</span>}
              {rejectCount > 0 && <span className="text-destructive font-medium">{rejectCount} reject</span>}
            </div>
            <Button
              size="sm"
              onClick={submitBatch}
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Submit Batch ({batch.size})
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectDialogLoan} onOpenChange={(open) => { if (!open) setRejectDialogLoan(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejection Reason</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
