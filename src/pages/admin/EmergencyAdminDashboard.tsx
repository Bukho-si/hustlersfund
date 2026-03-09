import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/constants';
import {
  AlertTriangle, ChevronRight, Shield, FileCheck, BarChart3,
  Users, CheckCircle, XCircle, PlusCircle, Car, Heart
} from 'lucide-react';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface EventSummary {
  id: string;
  title: string;
  type: 'funeral' | 'accident';
  totalMembers: number;
  paidMembers: number;
  unpaidMembers: number;
  collected: number;
  target: number;
}

interface Stats {
  activeEvents: number;
  emergencyCollected: number;
  pendingPayments: number;
  paidMembers: number;
  unpaidMembers: number;
  events: EventSummary[];
}

export default function EmergencyAdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeEvents: 0,
    emergencyCollected: 0,
    pendingPayments: 0,
    paidMembers: 0,
    unpaidMembers: 0,
    events: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const stableFetch = useCallback(() => { fetchStats(); }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useRealtimeRefresh(['emergency_events', 'emergency_dues', 'payments'], stableFetch);

  const fetchStats = async () => {
    try {
      const [eventsRes, duesRes, pendingPay] = await Promise.all([
        supabase.from('emergency_events').select('id, title, type, amount_per_member').eq('status', 'active'),
        supabase.from('emergency_dues').select('event_id, amount_due, amount_paid, status'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'pending_verification']).gt('emergency_total_amount', 0),
      ]);

      const activeEvents = eventsRes.data || [];
      const allDues = duesRes.data || [];
      const collected = allDues.reduce((s, d) => s + Number(d.amount_paid), 0);
      const paid = allDues.filter(d => d.status === 'paid').length;
      const unpaid = allDues.filter(d => d.status === 'unpaid').length;

      const events: EventSummary[] = activeEvents.map(evt => {
        const eventDues = allDues.filter(d => d.event_id === evt.id);
        const evtPaid = eventDues.filter(d => d.status === 'paid').length;
        const evtUnpaid = eventDues.filter(d => d.status === 'unpaid').length;
        const evtCollected = eventDues.reduce((s, d) => s + Number(d.amount_paid), 0);
        const evtTarget = eventDues.reduce((s, d) => s + Number(d.amount_due), 0);
        return {
          id: evt.id, title: evt.title, type: evt.type as 'funeral' | 'accident',
          totalMembers: eventDues.length, paidMembers: evtPaid, unpaidMembers: evtUnpaid,
          collected: evtCollected, target: evtTarget,
        };
      });

      setStats({
        activeEvents: activeEvents.length,
        emergencyCollected: collected,
        pendingPayments: pendingPay.count || 0,
        paidMembers: paid,
        unpaidMembers: unpaid,
        events,
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Active Events', value: stats.activeEvents.toString(), icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', href: '/admin/events' },
    { label: 'Emergency Collected', value: formatCurrency(stats.emergencyCollected), icon: Shield, color: 'text-success', bgColor: 'bg-success/10', href: '/admin/emergency-payments' },
    { label: 'Pending Payments', value: stats.pendingPayments.toString(), icon: FileCheck, color: 'text-warning', bgColor: 'bg-warning/10', href: '/admin/emergency-payments' },
    { label: 'Paid / Unpaid', value: `${stats.paidMembers} / ${stats.unpaidMembers}`, icon: Users, color: 'text-info', bgColor: 'bg-info/10', href: '/admin/emergency-payments' },
  ];

  const funeralEvents = stats.events.filter(e => e.type === 'funeral');
  const accidentEvents = stats.events.filter(e => e.type === 'accident');

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Emergency Dashboard"
        subtitle="Manage emergency events & payments"
        action={<Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Member View</Link>}
      />

      <Card className="mb-4 bg-destructive/90 text-destructive-foreground">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Emergency Admin</h2>
            <p className="text-destructive-foreground/70 text-sm">Emergency Operations</p>
          </div>
        </CardContent>
      </Card>

      {/* Paid vs Unpaid Bar */}
      <Card className="mb-4 animate-fade-in">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Member Payment Status</p>
          <div className="flex gap-4 mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold">{stats.paidMembers} Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">{stats.unpaidMembers} Unpaid</span>
            </div>
          </div>
          {(stats.paidMembers + stats.unpaidMembers) > 0 && (
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${(stats.paidMembers / (stats.paidMembers + stats.unpaidMembers)) * 100}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map((stat, i) => (
          <Link key={stat.label} to={stat.href} className="block animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <Card className="h-full hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active Events Summary */}
      {stats.events.length > 0 && (
        <div className="space-y-4 mb-4">
          {funeralEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground">Funeral Events ({funeralEvents.length})</h3>
              </div>
              {funeralEvents.map(renderEventCard)}
            </div>
          )}
          {accidentEvents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-muted-foreground">Accident Events ({accidentEvents.length})</h3>
              </div>
              {accidentEvents.map(renderEventCard)}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/admin/events', icon: PlusCircle, label: 'Create Emergency Event', color: 'text-destructive' },
              { to: '/admin/emergency-payments', icon: FileCheck, label: 'Verify Emergency Payments', color: 'text-warning' },
              { to: '/admin/emergency-reports', icon: BarChart3, label: 'View Emergency Reports', color: 'text-info' },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-2">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function renderEventCard(evt: EventSummary) {
  const pct = evt.target > 0 ? Math.round((evt.collected / evt.target) * 100) : 0;
  const detailHref = evt.type === 'funeral' ? '/admin/funeral-payments' : '/admin/accident-payments';
  return (
    <Link key={evt.id} to={detailHref} className="block">
      <Card className="animate-fade-in hover:shadow-card-hover transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{evt.title}</p>
              <p className="text-xs text-muted-foreground">Members: {evt.totalMembers}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span>Paid: <span className="font-semibold">{evt.paidMembers}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span>Outstanding: <span className="font-semibold">{evt.unpaidMembers}</span></span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-semibold">{formatCurrency(evt.collected)} / {formatCurrency(evt.target)}</span>
            </div>
            <Progress value={pct} className="h-2.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
