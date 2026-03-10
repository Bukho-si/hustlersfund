import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContributionSettings {
  id: string;
  joining_fee_amount: number;
  weekly_subscription_amount: number;
  late_fine_amount: number;
  cash_atm_fee_amount: number;
  petrol_loan_weekly_cap: number;
  personal_loan_monthly_cap: number;
  funeral_emergency_amount: number;
  accident_emergency_amount: number;
  loss_of_member_amount: number;
  loss_of_beneficiary_amount: number;
  updated_at: string;
}

// Default values matching the database defaults
export const DEFAULT_CONTRIBUTION_SETTINGS: Omit<ContributionSettings, 'id' | 'updated_at'> = {
  joining_fee_amount: 200,
  weekly_subscription_amount: 150,
  late_fine_amount: 50,
  cash_atm_fee_amount: 10,
  petrol_loan_weekly_cap: 1500,
  personal_loan_monthly_cap: 5000,
  funeral_emergency_amount: 200,
  accident_emergency_amount: 50,
};

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export function useContributionSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['contribution-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribution_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (error) throw error;
      return data as ContributionSettings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Return defaults while loading or on error
  const settings: ContributionSettings = data ?? {
    id: SETTINGS_ID,
    ...DEFAULT_CONTRIBUTION_SETTINGS,
    updated_at: new Date().toISOString(),
  };

  return {
    settings,
    isLoading,
    error,
  };
}

export function useUpdateContributionSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      newSettings,
      oldSettings,
      actorUserId,
    }: {
      newSettings: Partial<Omit<ContributionSettings, 'id' | 'updated_at'>>;
      oldSettings: ContributionSettings;
      actorUserId: string;
    }) => {
      // Update the settings
      const { error: updateError } = await supabase
        .from('contribution_settings')
        .update(newSettings)
        .eq('id', SETTINGS_ID);

      if (updateError) throw updateError;

      // Create audit log entry
      const { error: auditError } = await supabase.from('audit_log').insert([{
        actor_user_id: actorUserId,
        action: 'CONTRIBUTION_SETTINGS_UPDATED',
        entity_type: 'contribution_settings',
        entity_id: SETTINGS_ID,
        metadata_json: JSON.parse(JSON.stringify({
          old_values: oldSettings,
          new_values: newSettings,
        })),
      }]);

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
        // Don't throw - settings were updated successfully
      }

      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contribution-settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Contribution amounts have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
      console.error('Update settings error:', error);
    },
  });
}

// Helper functions that use settings
export const getJoiningFeeTotal = (slots: number, settings: ContributionSettings) =>
  settings.joining_fee_amount * slots;

export const getWeeklySubscription = (slots: number, settings: ContributionSettings) =>
  settings.weekly_subscription_amount * slots;

export const getPetrolLoanMax = (slots: number, settings: ContributionSettings) =>
  settings.petrol_loan_weekly_cap * slots;

export const getPersonalLoanMax = (slots: number, settings: ContributionSettings) =>
  settings.personal_loan_monthly_cap * slots;

export const getJoiningFeeRemaining = (slots: number, paidTotal: number, settings: ContributionSettings) =>
  Math.max(0, getJoiningFeeTotal(slots, settings) - paidTotal);
