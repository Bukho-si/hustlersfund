import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StatementEntryType = 'contribution' | 'loan' | 'repayment' | 'interest';

export interface StatementEntry {
  entry_date: string;
  entry_type: StatementEntryType;
  description: string;
  amount: number;
  balance: number;
}

export function useMemberStatement(userId?: string) {
  return useQuery({
    queryKey: ['member-statement', userId],
    enabled: !!userId,
    queryFn: async (): Promise<StatementEntry[]> => {
      const { data, error } = await supabase.rpc('get_member_statement' as any, {
        _user_id: userId,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        entry_date: r.entry_date,
        entry_type: r.entry_type,
        description: r.description,
        amount: Number(r.amount),
        balance: Number(r.balance),
      }));
    },
    refetchInterval: 60000,
  });
}
