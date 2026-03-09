import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { AlertTriangle, Heart, Car, CreditCard, Users, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface EmergencyEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  amount_per_member: number;
  status: string;
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
      .select(`
        *,
        event:emergency_events (*)
      `)
      .eq('member_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching emergency dues:', error);
    } else {
      setDues(data || []);

      // Fetch progress for active events
      const activeEventIds = [...new Set((data || []).filter(d => d.event?.status === 'active').map(d => d.event_id))];
      if (activeEventIds.length > 0) {
        const { data: allDues } = await supabase
          .from('emergency_dues')
          .select('event_id, status')
          .in('event_id', activeEventIds);

        const progress: Record<string, EventProgress> = {};
        activeEventIds.forEach(eid => {
          const eventDues = (allDues || []).filter(d => d.event_id === eid);
          progress[eid] = {
            totalMembers: eventDues.length,
            paidMembers: eventDues.filter(d => d.status === 'paid').length,
          };
        });
        setEventProgress(progress);
      }
    }
    setIsLoading(false);
  };

  const getEventIcon = (type: string) => {
    return type === 'funeral' ? (
      <Heart className="h-5 w-5 text-muted-foreground" />
    ) : (
      <Car className="h-5 w-5 text-warning" />
    );
  };

  const totalUnpaid = dues
    .filter(d => d.status === 'unpaid')
    .reduce((sum, d) => sum + (Number(d.amount_due) - Number(d.amount_paid)), 0);

  return (
    <AppLayout>
      <PageHeader 
        title="Emergency Contributions" 
        subtitle="Support fellow members in need"
      />

      {/* Outstanding Total */}
      {totalUnpaid > 0 && (
        <Card className="mb-4 bg-warning/10 border-warning/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalUnpaid)}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
          </CardContent>
        </Card>
      )}

      {/* Submit Payment CTA */}
      {totalUnpaid > 0 && (
        <Link to="/payments/submit">
          <Button className="w-full mb-4 bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <CreditCard className="h-4 w-4" />
            Submit Payment
          </Button>
        </Link>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dues.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No emergency events</h3>
              <p className="text-sm text-muted-foreground">
                When emergency contributions are needed, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          dues.map((due, index) => (
            <Card 
              key={due.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getEventIcon(due.event.type)}
                    <div>
                      <p className="font-medium">{due.event.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {due.event.type} • {formatDate(due.event.event_date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={due.status} variant="emergency" />
                </div>

                {due.event.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {due.event.description}
                  </p>
                )}

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount due</span>
                    <span className="font-medium">{formatCurrency(Number(due.amount_due))}</span>
                  </div>
                  {Number(due.amount_paid) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Amount paid</span>
                      <span>{formatCurrency(Number(due.amount_paid))}</span>
                    </div>
                  )}
                  {due.status === 'unpaid' && (
                    <div className="flex justify-between font-semibold pt-1">
                      <span>Remaining</span>
                      <span className="text-warning">
                        {formatCurrency(Number(due.amount_due) - Number(due.amount_paid))}
                      </span>
                    </div>
                  )}
                </div>

                {due.status === 'unpaid' && (
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Include this in your next weekly payment
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
