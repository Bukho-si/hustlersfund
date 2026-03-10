import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import { CreditCard, Loader2 } from 'lucide-react';

interface EmergencyPayment {
  id: string;
  member_user_id: string;
  event_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  updated_at: string;
  event: { title: string; type: string } | null;
  profile: { full_name: string } | null;
}

import { EmergencyType, getEmergencyTypeConfig } from '@/lib/emergencyTypes';

interface EmergencyPaymentsFilteredProps {
  emergencyType: EmergencyType;
}

export default function EmergencyPaymentsFiltered({ emergencyType }: EmergencyPaymentsFilteredProps) {
  const [dues, setDues] = useState<EmergencyPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const typeLabel = getEmergencyTypeConfig(emergencyType).label;

  useEffect(() => { fetchDues(); }, []);

  const fetchDues = async () => {
    // Get event IDs for this type
    const { data: events } = await supabase
      .from('emergency_events')
      .select('id')
      .eq('type', emergencyType);

    const eventIds = events?.map(e => e.id) || [];
    if (eventIds.length === 0) { setIsLoading(false); return; }

    const { data, error } = await supabase
      .from('emergency_dues')
      .select('*, emergency_events(title, type)')
      .in('event_id', eventIds)
      .order('updated_at', { ascending: false });

    if (error) { console.error(error); setIsLoading(false); return; }

    const duesWithProfiles = await Promise.all(
      (data || []).map(async (due: any) => {
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('full_name')
          .eq('user_id', due.member_user_id)
          .maybeSingle();
        return { ...due, event: due.emergency_events, profile };
      })
    );

    setDues(duesWithProfiles);
    setIsLoading(false);
  };

  const unpaidDues = dues.filter(d => d.status === 'unpaid');
  const paidDues = dues.filter(d => d.status === 'paid');

  return (
    <AppLayout requireAdmin>
      <PageHeader title={`${typeLabel} Payments`} subtitle={`Track ${emergencyType} contribution payments`} showBack />

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : dues.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No {emergencyType} payments</h3>
            <p className="text-sm text-muted-foreground">Dues will appear when {emergencyType} events are created</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {unpaidDues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Unpaid ({unpaidDues.length})</h3>
              <div className="space-y-2">
                {unpaidDues.map(due => (
                  <Card key={due.id} className="animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{due.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{due.event?.title}</p>
                        </div>
                        <StatusBadge status="unpaid" variant="emergency" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Due</span>
                        <span className="font-semibold">{formatCurrency(Number(due.amount_due))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-semibold text-success">{formatCurrency(Number(due.amount_paid))}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {paidDues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Paid ({paidDues.length})</h3>
              <div className="space-y-2">
                {paidDues.map(due => (
                  <Card key={due.id} className="animate-fade-in opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{due.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{due.event?.title}</p>
                        </div>
                        <StatusBadge status="paid" variant="emergency" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold">{formatCurrency(Number(due.amount_paid))}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
