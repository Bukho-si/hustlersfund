import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Loader2, Plus } from 'lucide-react';

interface RecordRepaymentDialogProps {
  loanId: string;
  outstandingBalance: number;
  memberName: string;
  onSuccess: () => void;
  userId: string;
}

export function RecordRepaymentDialog({ 
  loanId, 
  outstandingBalance, 
  memberName,
  onSuccess,
  userId 
}: RecordRepaymentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const repaymentAmount = parseFloat(amount);
    
    if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (repaymentAmount > outstandingBalance) {
      toast({
        title: 'Amount too high',
        description: `Amount cannot exceed outstanding balance of ${formatCurrency(outstandingBalance)}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert the repayment record
      const { error: repaymentError } = await supabase
        .from('loan_repayments')
        .insert({
          loan_id: loanId,
          amount: repaymentAmount,
          recorded_by: userId,
        });

      if (repaymentError) throw repaymentError;

      // Update the loan's outstanding balance
      const newBalance = outstandingBalance - repaymentAmount;
      const { error: loanError } = await supabase
        .from('loans')
        .update({ outstanding_balance: newBalance })
        .eq('id', loanId);

      if (loanError) throw loanError;

      toast({
        title: 'Repayment recorded',
        description: `${formatCurrency(repaymentAmount)} recorded for ${memberName}`,
      });

      setAmount('');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error recording repayment',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Repayment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Member</p>
            <p className="font-medium">{memberName}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="font-semibold text-lg text-accent">{formatCurrency(outstandingBalance)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Repayment Amount (R)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={outstandingBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
