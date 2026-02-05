import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Loader2, History, ArrowRight } from 'lucide-react';

interface PaymentHistoryEntry {
  id: string;
  action: string;
  created_at: string;
  actor_user_id: string | null;
  metadata_json: {
    member_name?: string;
    previous_total?: number;
    new_total?: number;
    explanation?: string;
    previous_values?: {
      base_amount: number;
      joining_fee_amount: number;
      late_fine_amount: number;
      cash_fee_amount: number;
      emergency_total_amount: number;
    };
    new_values?: {
      base_amount: number;
      joining_fee_amount: number;
      late_fine_amount: number;
      cash_fee_amount: number;
      emergency_total_amount: number;
    };
  } | null;
  actor_profile?: {
    full_name: string;
  } | null;
}

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string | null;
  memberName?: string;
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  paymentId,
  memberName,
}: PaymentHistoryDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<PaymentHistoryEntry[]>([]);

  useEffect(() => {
    if (open && paymentId) {
      fetchHistory();
    }
  }, [open, paymentId]);

  const fetchHistory = async () => {
    if (!paymentId) return;
    
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_type', 'payment')
      .eq('entity_id', paymentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      setHistory([]);
    } else {
      // Fetch actor profiles for each entry
      const entriesWithProfiles = await Promise.all(
        (data || []).map(async (entry) => {
          if (entry.actor_user_id) {
            const { data: profile } = await supabase
              .from('member_profiles')
              .select('full_name')
              .eq('user_id', entry.actor_user_id)
              .maybeSingle();
            return { ...entry, actor_profile: profile };
          }
          return { ...entry, actor_profile: null };
        })
      );
      setHistory(entriesWithProfiles as PaymentHistoryEntry[]);
    }
    
    setIsLoading(false);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'verified_payment_edited':
        return 'Verified Payment Edited';
      case 'payment_edited':
        return 'Payment Edited';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const renderAmountChange = (label: string, prev: number | undefined, next: number | undefined) => {
    if (prev === next || (prev === undefined && next === undefined)) return null;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground w-24">{label}:</span>
        <span className="text-destructive">{formatCurrency(prev || 0)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-success">{formatCurrency(next || 0)}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment Edit History
          </DialogTitle>
          <DialogDescription>
            {memberName ? `Changes made to ${memberName}'s payment` : 'All changes made to this payment'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No edit history found</p>
              <p className="text-xs mt-1">This payment has not been modified</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                const metadata = entry.metadata_json;
                const prevValues = metadata?.previous_values;
                const newValues = metadata?.new_values;

                return (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {getActionLabel(entry.action)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">by</p>
                        <p className="text-sm font-medium">
                          {entry.actor_profile?.full_name || 'System'}
                        </p>
                      </div>
                    </div>

                    {metadata?.previous_total !== undefined && metadata?.new_total !== undefined && (
                      <div className="bg-muted/50 rounded-md p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-sm">Total:</span>
                          <span className="text-destructive">{formatCurrency(metadata.previous_total)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-success">{formatCurrency(metadata.new_total)}</span>
                        </div>
                      </div>
                    )}

                    {(prevValues || newValues) && (
                      <div className="space-y-1 bg-muted/30 rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Breakdown Changes:</p>
                        {renderAmountChange('Weekly', prevValues?.base_amount, newValues?.base_amount)}
                        {renderAmountChange('Joining Fee', prevValues?.joining_fee_amount, newValues?.joining_fee_amount)}
                        {renderAmountChange('Late Fine', prevValues?.late_fine_amount, newValues?.late_fine_amount)}
                        {renderAmountChange('Cash/ATM Fee', prevValues?.cash_fee_amount, newValues?.cash_fee_amount)}
                        {renderAmountChange('Emergency', prevValues?.emergency_total_amount, newValues?.emergency_total_amount)}
                      </div>
                    )}

                    {metadata?.explanation && (
                      <div className="bg-accent/10 border border-accent/30 rounded-md p-3">
                        <p className="text-xs font-medium text-accent mb-1">Explanation:</p>
                        <p className="text-sm italic">"{metadata.explanation}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
