import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'payments' | 'loans' | 'loan_repayments' | 'emergency_events' | 'emergency_dues' | 'member_profiles';

/**
 * Subscribe to realtime changes on specified tables and call onUpdate when any change occurs.
 */
export function useRealtimeRefresh(tables: TableName[], onUpdate: () => void) {
  const stableOnUpdate = useCallback(onUpdate, [onUpdate]);

  useEffect(() => {
    const channel = supabase.channel('admin-dashboard-realtime');

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => stableOnUpdate()
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), stableOnUpdate]);
}
