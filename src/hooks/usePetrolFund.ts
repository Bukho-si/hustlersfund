import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PetrolFund {
  id: string;
  current_balance: number;
  low_balance_threshold: number;
  last_updated: string;
}

export interface PetrolRequestWindow {
  id: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

export function usePetrolFund() {
  const [fund, setFund] = useState<PetrolFund | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('petrol_fund')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setFund(data as PetrolFund);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('petrol-fund-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petrol_fund' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const isLowBalance = fund ? fund.current_balance < fund.low_balance_threshold : false;
  const canApprove = (amount: number) => fund ? amount <= fund.current_balance : false;

  return { fund, isLoading, isLowBalance, canApprove, refetch: fetch };
}

export function usePetrolRequestWindow() {
  const [window, setWindow] = useState<PetrolRequestWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('petrol_request_window')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) setWindow(data as PetrolRequestWindow);
      setIsLoading(false);
    };
    fetch();
  }, []);

  const isWithinWindow = (): boolean => {
    if (!window || !window.active) return true; // If no window or inactive, allow
    const now = new Date();
    // Use SA timezone
    const saTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    const hours = saTime.getHours();
    const minutes = saTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [startH, startM] = window.start_time.split(':').map(Number);
    const [endH, endM] = window.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  return { window, isLoading, isWithinWindow };
}
