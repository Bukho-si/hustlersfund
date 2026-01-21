import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Receipt, Loader2 } from 'lucide-react';

interface Repayment {
  id: string;
  amount: number;
  paid_at: string;
}

interface RepaymentHistoryProps {
  loanId: string;
  refreshTrigger?: number;
}

export function RepaymentHistory({ loanId, refreshTrigger }: RepaymentHistoryProps) {
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRepayments();
  }, [loanId, refreshTrigger]);

  const fetchRepayments = async () => {
    const { data, error } = await supabase
      .from('loan_repayments')
      .select('id, amount, paid_at')
      .eq('loan_id', loanId)
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('Error fetching repayments:', error);
    } else {
      setRepayments(data || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (repayments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No repayments recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Repayment History
      </p>
      {repayments.map((repayment) => (
        <div 
          key={repayment.id} 
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">
              {formatDate(repayment.paid_at)}
            </span>
          </div>
          <span className="text-sm font-medium text-success">
            -{formatCurrency(Number(repayment.amount))}
          </span>
        </div>
      ))}
    </div>
  );
}
