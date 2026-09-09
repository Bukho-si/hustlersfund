import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

interface MemberOption {
  user_id: string;
  full_name: string;
}

export function AddPetrolToPersonalDialog({ onSuccess }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('15');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [profiles, settings] = await Promise.all([
        supabase
          .from('member_profiles')
          .select('user_id, full_name')
          .in('status', ['active', 'pending'])
          .order('full_name'),
        supabase
          .from('loan_settings')
          .select('personal_interest_rate_percent')
          .order('created_at')
          .limit(1)
          .maybeSingle(),
      ]);
      setMembers((profiles.data || []) as MemberOption[]);
      if (settings.data?.personal_interest_rate_percent != null) {
        setRate(String(Number(settings.data.personal_interest_rate_percent)));
      }
    })();
  }, [open]);

  const amountNum = Number(amount) || 0;
  const rateNum = Number(rate) || 0;
  const interest = Math.round(amountNum * rateNum) / 100;
  const total = amountNum + interest;

  const handleSubmit = async () => {
    if (loading) return;
    if (!user) return;
    if (!memberId) {
      toast({ title: 'Select a member', variant: 'destructive' });
      return;
    }
    if (amountNum <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('loans')
        .insert({
          member_user_id: memberId,
          type: 'personal',
          amount: amountNum,
          reason: note.trim() || 'Petrol loan captured manually onto personal loan',
          status: 'approved',
          approved_by: user.id,
          approved_at: now,
          outstanding_balance: total,
          interest_rate_percent: rateNum,
          interest_amount: interest,
          total_repayable: total,
          repayment_period: 'MONTHLY',
        })
        .select('id')
        .maybeSingle();

      if (error) throw error;

      await supabase.from('personal_loan_activity').insert({
        loan_id: data?.id ?? null,
        actor_user_id: user.id,
        action: 'manual_petrol_capture',
        details: `Petrol loan of ${formatCurrency(amountNum)} added manually as a personal loan (${formatCurrency(total)} owing).${note.trim() ? ` Note: ${note.trim()}` : ''}`,
      });

      toast({
        title: 'Added to personal loans',
        description: `${formatCurrency(total)} now owing.`,
      });
      setOpen(false);
      setMemberId('');
      setAmount('');
      setNote('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Could not add loan', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full mb-4">
          <Plus className="h-4 w-4 mr-1" /> Add Petrol Loan Manually
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Petrol Loan to Personal</DialogTitle>
          <DialogDescription>
            Capture a petrol loan handled outside the app as a personal loan for a member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="petrol-amount">Petrol amount (R)</Label>
              <Input
                id="petrol-amount"
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="petrol-rate">Interest (%)</Label>
              <Input
                id="petrol-rate"
                type="number"
                inputMode="decimal"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-muted rounded p-3">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-right font-medium">{formatCurrency(amountNum)}</span>
            <span className="text-muted-foreground">Interest</span>
            <span className="text-right font-medium">{formatCurrency(interest)}</span>
            <span className="text-muted-foreground">Total owing</span>
            <span className="text-right font-semibold">{formatCurrency(total)}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="petrol-note">Note (optional)</Label>
            <Textarea
              id="petrol-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Petrol advanced on 5 Sep, agreed with member"
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Personal Loans'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
