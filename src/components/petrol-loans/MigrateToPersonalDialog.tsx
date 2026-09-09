import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Loader2, ArrowRightLeft } from 'lucide-react';

interface Props {
  loanId: string;
  memberUserId: string;
  memberName: string;
  outstanding: number;
  onSuccess: () => void;
}

export function MigrateToPersonalDialog({
  loanId, memberUserId, memberName, outstanding, onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [rate, setRate] = useState(15);
  const [existing, setExisting] = useState<{ id: string; outstanding_balance: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [settings, target] = await Promise.all([
        supabase.from('loan_settings').select('personal_interest_rate_percent').order('created_at').limit(1).maybeSingle(),
        supabase
          .from('loans')
          .select('id, outstanding_balance')
          .eq('member_user_id', memberUserId)
          .eq('type', 'personal')
          .in('status', ['approved', 'disbursed'])
          .gt('outstanding_balance', 0)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (settings.data?.personal_interest_rate_percent != null) {
        setRate(Number(settings.data.personal_interest_rate_percent));
      }
      setExisting(target.data ? { id: target.data.id, outstanding_balance: Number(target.data.outstanding_balance) } : null);
    })();
  }, [open, memberUserId]);

  const interest = Math.round(outstanding * rate) / 100;
  const total = outstanding + interest;

  const handleMigrate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('migrate_petrol_loan_to_personal', {
        _petrol_loan_id: loanId,
        _reason: reason.trim() || null,
      });
      if (error) throw error;
      const result = data as any;
      toast({
        title: 'Petrol loan migrated',
        description: `${formatCurrency(Number(result?.total_added ?? total))} added to ${result?.merged_into_existing ? 'the existing' : 'a new'} personal loan.`,
      });
      setOpen(false);
      setReason('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Migration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          <ArrowRightLeft className="h-3 w-3 mr-1" /> Migrate to Personal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrate Petrol Loan</DialogTitle>
          <DialogDescription>
            {memberName} · Move the remaining petrol balance onto their personal loan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2 text-xs bg-muted rounded p-3">
            <span className="text-muted-foreground">Petrol balance</span>
            <span className="text-right font-medium">{formatCurrency(outstanding)}</span>
            <span className="text-muted-foreground">Personal interest ({rate}%)</span>
            <span className="text-right font-medium">{formatCurrency(interest)}</span>
            <span className="text-muted-foreground">Total added</span>
            <span className="text-right font-semibold">{formatCurrency(total)}</span>
          </div>

          <div className="text-xs rounded p-3 border">
            {existing ? (
              <p>
                Added to the member's existing personal loan (current balance{' '}
                <span className="font-semibold">{formatCurrency(existing.outstanding_balance)}</span>) — new balance{' '}
                <span className="font-semibold">{formatCurrency(existing.outstanding_balance + total)}</span>.
              </p>
            ) : (
              <p>No open personal loan found — a new personal loan will be created for {formatCurrency(total)}.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="migrate-reason">Note (optional)</Label>
            <Textarea
              id="migrate-reason"
              placeholder="Why is this petrol loan being migrated?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            The petrol loan will be closed and marked as settled. This cannot be undone.
          </p>

          <Button className="w-full" onClick={handleMigrate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Migration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
