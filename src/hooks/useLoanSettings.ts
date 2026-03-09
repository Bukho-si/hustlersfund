import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LoanSettings {
  id: string;
  petrol_interest_rate_percent: number;
  personal_interest_rate_percent: number;
  interest_type: string;
  petrol_repayment_days: number;
  personal_repayment_days: number;
}

export function useLoanSettings() {
  const [settings, setSettings] = useState<LoanSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('loan_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching loan settings:', error);
      setError(error.message);
    } else if (data) {
      setSettings(data as any);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getInterestRate = (loanType: 'petrol' | 'personal'): number => {
    if (!settings) return loanType === 'petrol' ? 10 : 15;
    return loanType === 'petrol' 
      ? settings.petrol_interest_rate_percent 
      : settings.personal_interest_rate_percent;
  };

  const getRepaymentDays = (loanType: 'petrol' | 'personal'): number => {
    if (!settings) return loanType === 'petrol' ? 7 : 30;
    return loanType === 'petrol'
      ? settings.petrol_repayment_days
      : settings.personal_repayment_days;
  };

  return {
    settings,
    isLoading,
    error,
    getInterestRate,
    getRepaymentDays,
    refetch: fetchSettings
  };
}
