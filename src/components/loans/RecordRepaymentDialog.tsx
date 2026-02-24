import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Loader2, Plus } from 'lucide-react';

type RepaymentType = 'interest_only' | 'part_payment' | 'full_payment';

interface RecordRepaymentDialogProps {
  loanId: string;
  outstandingBalance: number;
  memberName: string;
  onSuccess: () => void;
  userId: string;
  interestAmount?: number | null;
}

export function RecordRepaymentDialog({ 
  loanId, 
  outstandingBalance, 
  memberName,
  onSuccess,
  userId,
  interestAmount
}: RecordRepaymentDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('part_payment');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interestOnly = Number(interestAmount || 0);

  useEffect(() => {
    if (repaymentType === 'interest_only') {
      setAmount(interestOnly > 0 ? interestOnly.toFixed(2) : '');
    } else if (repaymentType === 'full_payment') {
      setAmount(outstandingBalance.toFixed(2));
    } else {
      setAmount('');
    }
  }, [repaymentType, interestOnly, outstandingBalance]);

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
      const { error: repaymentError } = await supabase
        .from('loan_repayments')
        .insert({
          loan_id: loanId,
          amount: repaymentAmount,
          recorded_by: userId,
        });

      if (repaymentError) throw repaymentError;

      const newBalance = outstandingBalance - repaymentAmount;
      const { error: loanError } = await supabase
        .from('loans')
        .update({ outstanding_balance: newBalance })
        .eq('id', loanId);

      if (loanError) throw loanError;

      const typeLabel = repaymentType === 'interest_only' ? 'Interest payment' 
        : repaymentType === 'full_payment' ? 'Full settlement' 
        : 'Part payment';

      toast({
        title: `${typeLabel} recorded`,
        description: `${formatCurrency(repaymentAmount)} recorded for ${memberName}`,
      });

      setAmount('');
      setRepaymentType('part_payment');
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
            {interestOnly > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Interest portion: {formatCurrency(interestOnly)}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Payment Type</Label>
            <RadioGroup
              value={repaymentType}
              onValueChange={(v) => setRepaymentType(v as RepaymentType)}
              className="space-y-2"
            >
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${repaymentType === 'interest_only' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                <RadioGroupItem value="interest_only" />
                <div>
                  <p className="text-sm font-medium">Pay Interest Only</p>
                  <p className="text-xs text-muted-foreground">
                    {interestOnly > 0 ? formatCurrency(interestOnly) : 'No interest on this loan'}
                  </p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${repaymentType === 'part_payment' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                <RadioGroupItem value="part_payment" />
                <div>
                  <p className="text-sm font-medium">Pay Part Loan</p>
                  <p className="text-xs text-muted-foreground">Enter a custom amount to pay off partially</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${repaymentType === 'full_payment' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                <RadioGroupItem value="full_payment" />
                <div>
                  <p className="text-sm font-medium">Pay Full Amount</p>
                  <p className="text-xs text-muted-foreground">Settle full balance of {formatCurrency(outstandingBalance)}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (R)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={outstandingBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={repaymentType === 'interest_only' || repaymentType === 'full_payment'}
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
              disabled={isSubmitting || (repaymentType === 'interest_only' && interestOnly <= 0)}
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
