import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Loader2, Percent } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  loanId: string;
  memberUserId: string;
  memberName: string;
  principal: number;
  currentOutstanding: number;
  userId: string;
  onSuccess: () => void;
}

export function AdjustInterestDialog({
  loanId, memberUserId, memberName, principal, currentOutstanding, userId, onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [repaid, setRepaid] = useState(0);
  const [newInterest, setNewInterest] = useState<string>('');
  const [cause, setCause] = useState('');
  const [reason, setReason] = useState('');

  const PREDEFINED_CAUSES = [
    'Late payment carry-over',
    'System error correction',
    'Manual reconciliation',
    'Interest rate change',
    'Other',
  ];

  const principalRemaining = Math.max(principal - repaid, 0);
  const currentInterest = Math.max(currentOutstanding - principalRemaining, 0);
  const parsedInterest = Number(newInterest);
  const newBalance = principalRemaining + (isNaN(parsedInterest) ? 0 : parsedInterest);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [sched, reps] = await Promise.all([
        supabase.from('personal_loan_schedule').select('id').eq('loan_id', loanId).maybeSingle(),
        supabase.from('loan_repayments').select('amount').eq('loan_id', loanId),
      ]);
      setScheduleId(sched.data?.id ?? null);
      setRepaid((reps.data ?? []).reduce((s, r) => s + Number(r.amount), 0));
      setNewInterest(String(Math.max(currentOutstanding - Math.max(principal - (reps.data ?? []).reduce((s, r) => s + Number(r.amount), 0), 0), 0).toFixed(2)));
    })();
  }, [open, loanId, principal, currentOutstanding]);

  const handleSave = async () => {
    if (isNaN(parsedInterest) || parsedInterest < 0) {
      toast({ title: 'Invalid amount', description: 'Interest must be a non-negative number.', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for this adjustment.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const balance = Number(newBalance.toFixed(2));

      if (scheduleId) {
        const { error: sErr } = await supabase
          .from('personal_loan_schedule')
          .update({
            current_balance: balance,
            status: balance <= 0 ? 'paid' : 'late',
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);
        if (sErr) throw sErr;
      }

      const { error: lErr } = await supabase
        .from('loans')
        .update({
          outstanding_balance: balance,
          status: balance <= 0 ? 'repaid' : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId);
      if (lErr) throw lErr;

      await supabase.from('audit_log').insert({
        actor_user_id: userId,
        action: 'adjust_personal_loan_interest',
        entity_type: 'loan',
        entity_id: loanId,
        metadata_json: {
          member_user_id: memberUserId,
          previous_outstanding: currentOutstanding,
          previous_interest: currentInterest,
          new_interest: parsedInterest,
          new_outstanding: balance,
          reason: reason.trim(),
        },
      });

      toast({ title: 'Interest updated', description: `New outstanding: ${formatCurrency(balance)}` });
      setOpen(false);
      setReason('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          <Percent className="h-3 w-3 mr-1" /> Adjust Interest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Interest</DialogTitle>
          <DialogDescription>{memberName} · Manually set the interest portion of this loan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2 text-xs bg-muted rounded p-3">
            <span className="text-muted-foreground">Principal</span>
            <span className="text-right font-medium">{formatCurrency(principal)}</span>
            <span className="text-muted-foreground">Repaid</span>
            <span className="text-right font-medium">{formatCurrency(repaid)}</span>
            <span className="text-muted-foreground">Principal Remaining</span>
            <span className="text-right font-medium">{formatCurrency(principalRemaining)}</span>
            <span className="text-muted-foreground">Current Interest</span>
            <span className="text-right font-medium">{formatCurrency(currentInterest)}</span>
            <span className="text-muted-foreground">Current Outstanding</span>
            <span className="text-right font-semibold">{formatCurrency(currentOutstanding)}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="interest">New Interest Amount (R)</Label>
            <Input
              id="interest"
              type="number"
              step="0.01"
              min="0"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              New outstanding will be <span className="font-semibold text-foreground">{formatCurrency(newBalance)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Why is this adjustment needed?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Adjustment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
