import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PersonalFund {
  id: string;
  current_balance: number;
  low_balance_threshold: number;
  last_updated: string;
}

export function usePersonalFund() {
  const [fund, setFund] = useState<PersonalFund | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('personal_loan_fund')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setFund(data as PersonalFund);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('personal-fund-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_loan_fund' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const isLowBalance = fund ? fund.current_balance < fund.low_balance_threshold : false;
  const canApprove = (amount: number) => fund ? amount <= fund.current_balance : false;

  return { fund, isLoading, isLowBalance, canApprove, refetch: fetch };
}
