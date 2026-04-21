import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PersonalLoanScheduleRow {
  id: string;
  loan_id: string;
  member_user_id: string;
  due_date: string;
  original_amount: number;
  current_balance: number;
  status: 'pending' | 'paid' | 'late';
  months_late: number;
  last_interest_applied_month: string | null;
  created_at: string;
  updated_at: string;
}

export function usePersonalLoanSchedule(memberUserId?: string) {
  const [rows, setRows] = useState<PersonalLoanScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let q = supabase.from('personal_loan_schedule').select('*').order('due_date', { ascending: true });
    if (memberUserId) q = q.eq('member_user_id', memberUserId);
    const { data, error } = await q;
    if (!error && data) setRows(data as PersonalLoanScheduleRow[]);
    setIsLoading(false);
  }, [memberUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rows, isLoading, refresh: fetch };
}
