import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/lib/constants';
import {
  CheckCircle, XCircle, DollarSign, Fuel, AlertTriangle,
  CreditCard, Clock, ArrowUpRight, ArrowDownLeft, Bell
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: 'loan_approved' | 'loan_rejected' | 'loan_disbursed' | 'repayment' | 'contribution' | 'emergency' | 'notification' | 'default';
}

const ICON_MAP = {
  loan_approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  loan_rejected: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  loan_disbursed: { icon: ArrowDownLeft, color: 'text-info', bg: 'bg-info/10' },
  repayment: { icon: ArrowUpRight, color: 'text-success', bg: 'bg-success/10' },
  contribution: { icon: CreditCard, color: 'text-accent', bg: 'bg-accent/10' },
  emergency: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  notification: { icon: Bell, color: 'text-info', bg: 'bg-info/10' },
  default: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function Activity() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchActivity();
  }, [user]);

  const fetchActivity = async () => {
    if (!user) return;

    try {
      const [walletRes, notifRes, emergencyRes] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('id, transaction_type, amount, description, created_at')
          .eq('member_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('notifications')
          .select('id, title, message, type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('emergency_dues')
          .select('id, amount_due, status, created_at, event:emergency_events(title, type)')
          .eq('member_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const activities: ActivityEvent[] = [];

      (walletRes.data || []).forEach(txn => {
        let iconType: ActivityEvent['icon'] = 'default';
        let title = '';

        switch (txn.transaction_type) {
          case 'petrol_loan_issued':
            iconType = 'loan_disbursed'; title = 'Petrol Loan Disbursed'; break;
          case 'personal_loan_issued':
            iconType = 'loan_disbursed'; title = 'Personal Loan Disbursed'; break;
          case 'petrol_loan_repayment':
            iconType = 'repayment'; title = 'Petrol Loan Repayment'; break;
          case 'personal_loan_repayment':
            iconType = 'repayment'; title = 'Personal Loan Repayment'; break;
          case 'weekly_contribution':
            iconType = 'contribution'; title = 'Contribution Verified'; break;
          case 'joining_fee_payment':
            iconType = 'contribution'; title = 'Joining Fee Payment'; break;
          case 'funeral_contribution':
          case 'accident_contribution':
          case 'emergency_contribution':
            iconType = 'emergency'; title = 'Emergency Contribution'; break;
          case 'late_fee':
            iconType = 'default'; title = 'Late Fee Charged'; break;
          case 'cash_fee':
            iconType = 'default'; title = 'Cash/ATM Fee'; break;
          default:
            title = txn.transaction_type;
        }

        activities.push({
          id: `txn-${txn.id}`,
          type: txn.transaction_type,
          title,
          description: txn.description || `R${Number(txn.amount).toFixed(2)}`,
          timestamp: txn.created_at,
          icon: iconType,
        });
      });

      (notifRes.data || []).forEach(n => {
        let iconType: ActivityEvent['icon'] = 'notification';
        if (n.type === 'loan_approved') iconType = 'loan_approved';
        if (n.type === 'loan_rejected') iconType = 'loan_rejected';

        activities.push({
          id: `notif-${n.id}`,
          type: n.type,
          title: n.title,
          description: n.message,
          timestamp: n.created_at,
          icon: iconType,
        });
      });

      (emergencyRes.data || []).forEach(due => {
        const event = due.event as any;
        activities.push({
          id: `emg-${due.id}`,
          type: 'emergency',
          title: `Emergency: ${event?.title || 'Event'}`,
          description: `${event?.type || 'emergency'} contribution — R${Number(due.amount_due).toFixed(2)} ${due.status === 'paid' ? '(Paid)' : '(Outstanding)'}`,
          timestamp: due.created_at,
          icon: 'emergency',
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(activities.slice(0, 50));
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Activity" subtitle="Your recent events & transactions" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full rounded-xl" /></CardContent></Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="fintech-icon-box bg-muted mx-auto mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No activity yet</h3>
            <p className="text-sm text-muted-foreground">
              Your loan approvals, payments, and notifications will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-px bg-border/50" />

              <div className="space-y-0.5">
                {events.map((event, index) => {
                  const iconConfig = ICON_MAP[event.icon] || ICON_MAP.default;
                  const IconComp = iconConfig.icon;

                  return (
                    <div
                      key={event.id}
                      className="relative flex items-start gap-3.5 py-3 animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <div className={`relative z-10 fintech-icon-box ${iconConfig.bg} shrink-0`}>
                        <IconComp className={`h-4 w-4 ${iconConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDateTime(event.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
