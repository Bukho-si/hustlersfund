import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { AlertTriangle, Users, CheckCircle, Clock } from 'lucide-react';
import { getEmergencyTypeConfig } from '@/lib/emergencyTypes';

interface EmergencyEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  amount_per_member: number;
  status: string;
  payment_deadline: string | null;
}

interface EventProgress {
  totalMembers: number;
  paidMembers: number;
}

interface EmergencyDue {
  id: string;
  event_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  event: EmergencyEvent;
}

function getDisplayStatus(due: EmergencyDue): string {
  const paid = Number(due.amount_paid);
  const owed = Number(due.amount_due);
  if (paid >= owed) return 'paid';
  const deadlinePassed = due.event.payment_deadline 
    ? new Date(due.event.payment_deadline) < new Date() 
    : false;
  if (deadlinePassed && paid < owed) return 'overdue';
  if (paid > 0) return 'partially_paid';
  return 'unpaid';
}

export default function Emergencies() {
  const { user } = useAuth();
  const [dues, setDues] = useState<EmergencyDue[]>([]);
  const [eventProgress, setEventProgress] = useState<Record<string, EventProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchEmergencyDues();
  }, [user]);

  const fetchEmergencyDues = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('emergency_dues')
      .select(`*, event:emergency_events (*)`)
      .eq('member_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching emergency dues:', error);
    } else {
      setDues((data || []) as EmergencyDue[]);

      const activeEventIds = [...new Set((data || []).filter(d => (d as any).event?.status === 'active').map(d => d.event_id))];
      if (activeEventIds.length > 0) {
        const { data: allDues } = await supabase
          .from('emergency_dues')
          .select('event_id, status, amount_paid, amount_due')
          .in('event_id', activeEventIds);

        const progress: Record<string, EventProgress> = {};
        activeEventIds.forEach(eid => {
          const eventDues = (allDues || []).filter(d => d.event_id === eid);
          progress[eid] = {
            totalMembers: eventDues.length,
            paidMembers: eventDues.filter(d => Number(d.amount_paid) >= Number(d.amount_due)).length,
          };
        });
        setEventProgress(progress);
      }
    }
    setIsLoading(false);
  };

  const getEventIcon = (type: string) => {
    const config = getEmergencyTypeConfig(type);
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  const totalUnpaid = dues
    .filter(d => Number(d.amount_paid) < Number(d.amount_due))
    .reduce((sum, d) => sum + (Number(d.amount_due) - Number(d.amount_paid)), 0);

  return (
    <AppLayout>
      <PageHeader 
        title="Emergency Contributions" 
        subtitle="Support fellow members in need"
      />

      {/* Outstanding Total */}
      {totalUnpaid > 0 && (
        <Card className="mb-4 bg-warning/8 border-warning/15 animate-fade-in">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalUnpaid)}</p>
            </div>
            <div className="fintech-icon-box bg-warning/15">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-24 bg-muted rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="fintech-icon-box bg-muted mx-auto mb-4">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No emergency events</h3>
              <p className="text-sm text-muted-foreground">
                When emergency contributions are needed, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          dues.map((due, index) => {
            const remaining = Number(due.amount_due) - Number(due.amount_paid);
            const displayStatus = getDisplayStatus(due);
            const deadlinePassed = due.event.payment_deadline 
              ? new Date(due.event.payment_deadline) < new Date() 
              : false;
            const config = getEmergencyTypeConfig(due.event.type);

            return (
              <Card 
                key={due.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`fintech-icon-box-sm ${config.color.includes('warning') ? 'bg-warning/10' : config.color.includes('destructive') ? 'bg-destructive/10' : 'bg-info/10'}`}>
                        {getEventIcon(due.event.type)}
                      </div>
                      <div>
                        <p className="font-semibold">{due.event.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {config.label} • {formatDate(due.event.event_date)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={displayStatus} variant="emergency" />
                  </div>

                  {due.event.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {due.event.description}
                    </p>
                  )}

                  <div className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
                    <span className="text-muted-foreground">Amount due</span>
                    <span className="font-medium text-right">{formatCurrency(Number(due.amount_due))}</span>
                    <span className="text-success">Total paid</span>
                    <span className="text-success font-medium text-right">{formatCurrency(Number(due.amount_paid))}</span>
                    {remaining > 0 && (
                      <>
                        <span className="font-bold pt-1.5">Remaining</span>
                        <span className="font-bold text-warning text-right pt-1.5">
                          {formatCurrency(remaining)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Payment Deadline */}
                  {due.event.payment_deadline && remaining > 0 && (
                    <div className={`mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs border ${deadlinePassed ? 'bg-destructive/8 border-destructive/15 text-destructive' : 'bg-muted/50 border-border/50 text-muted-foreground'}`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">{deadlinePassed ? 'Deadline passed:' : 'Payment deadline:'} {formatDate(due.event.payment_deadline)}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {due.event.status === 'active' && eventProgress[due.event_id] && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Member Progress
                        </span>
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {eventProgress[due.event_id].paidMembers} / {eventProgress[due.event_id].totalMembers} paid
                        </span>
                      </div>
                      <Progress
                        value={eventProgress[due.event_id].totalMembers > 0
                          ? (eventProgress[due.event_id].paidMembers / eventProgress[due.event_id].totalMembers) * 100
                          : 0}
                        className="h-2.5"
                      />
                    </div>
                  )}

                  {remaining > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Emergency contributions are recorded by your admin
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
