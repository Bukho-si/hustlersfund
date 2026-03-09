import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { History, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FundHistoryEntry {
  id: string;
  created_at: string;
  actor_name: string;
  amount_added: number;
  previous_balance: number;
  new_balance: number;
  note: string | null;
}

interface FundHistoryDialogProps {
  fundType: 'petrol' | 'personal';
  fundId: string | null;
}

export function FundHistoryDialog({ fundType, fundId }: FundHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FundHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const label = fundType === 'petrol' ? 'Petrol' : 'Personal Loan';
  const entityType = `${fundType}_fund`;

  useEffect(() => {
    if (!open || !fundId) return;
    fetchHistory();
  }, [open, fundId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data: logs } = await supabase
        .from('audit_log')
        .select('id, created_at, actor_user_id, metadata_json')
        .eq('action', 'add_funds')
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false });

      if (!logs || logs.length === 0) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      // Get unique actor IDs
      const actorIds = [...new Set(logs.map(l => l.actor_user_id).filter(Boolean))] as string[];
      
      let profileMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('member_profiles')
          .select('user_id, full_name')
          .in('user_id', actorIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      const mapped: FundHistoryEntry[] = logs.map(log => {
        const meta = (log.metadata_json as any) || {};
        return {
          id: log.id,
          created_at: log.created_at,
          actor_name: profileMap[log.actor_user_id || ''] || 'Unknown',
          amount_added: meta.amount_added || 0,
          previous_balance: meta.previous_balance || 0,
          new_balance: meta.new_balance || 0,
          note: meta.note || null,
        };
      });

      setEntries(mapped);
    } catch (err) {
      console.error('Failed to load fund history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label} Fund Top-up History</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No top-ups recorded yet.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 pr-3">
              {entries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-success">
                        +{formatCurrency(entry.amount_added)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-xs font-medium">
                        {formatCurrency(entry.previous_balance)} → {formatCurrency(entry.new_balance)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>By: {entry.actor_name}</span>
                    {entry.note && (
                      <span className="italic truncate ml-2 max-w-[150px]" title={entry.note}>
                        "{entry.note}"
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
