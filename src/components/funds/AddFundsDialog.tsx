import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface AddFundsDialogProps {
  fundType: 'petrol' | 'personal';
  fundId: string | null;
  currentBalance: number;
  onSuccess?: () => void;
}

export function AddFundsDialog({ fundType, fundId, currentBalance, onSuccess }: AddFundsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const table = fundType === 'petrol' ? 'petrol_fund' : 'personal_loan_fund';
  const label = fundType === 'petrol' ? 'Petrol' : 'Personal Loan';

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!fundId || !user || isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive amount.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const newBalance = currentBalance + amountNum;

      const { error } = await supabase
        .from(table)
        .update({ current_balance: newBalance })
        .eq('id', fundId);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'add_funds',
        entity_type: `${fundType}_fund`,
        entity_id: fundId,
        actor_user_id: user.id,
        metadata_json: {
          amount_added: amountNum,
          previous_balance: currentBalance,
          new_balance: newBalance,
          note: note || null,
        },
      });

      toast({ title: `R${amountNum.toFixed(2)} added to ${label} Fund` });
      setAmount('');
      setNote('');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Failed to add funds', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Funds
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Funds to {label} Fund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-lg font-bold">R{currentBalance.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-amount">Amount to Add (R)</Label>
            <Input
              id="add-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-note">Note (optional)</Label>
            <Textarea
              id="add-note"
              placeholder="e.g. Monthly top-up"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-xs text-muted-foreground">New Balance After Top-up</p>
              <p className="text-lg font-bold text-success">
                R{(currentBalance + parseFloat(amount)).toFixed(2)}
              </p>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add R${parseFloat(amount || '0').toFixed(2)} to Fund`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
