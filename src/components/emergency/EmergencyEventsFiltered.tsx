import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { useContributionSettings } from '@/hooks/useContributionSettings';
import { Plus, Car, Heart, Loader2, Calendar, Clock } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface EmergencyEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  amount_per_member: number;
  status: string;
  created_at: string;
  payment_deadline: string | null;
}

interface EmergencyEventsFilteredProps {
  emergencyType: 'accident' | 'funeral';
}

export default function EmergencyEventsFiltered({ emergencyType }: EmergencyEventsFilteredProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useContributionSettings();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [amountPerMember, setAmountPerMember] = useState('');
  const [paymentWindow, setPaymentWindow] = useState('14');

  const typeLabel = emergencyType === 'funeral' ? 'Funeral' : 'Accident';
  const TypeIcon = emergencyType === 'funeral' ? Heart : Car;
  const defaultAmount = emergencyType === 'funeral' 
    ? settings.funeral_emergency_amount 
    : settings.accident_emergency_amount;

  useEffect(() => { fetchEvents(); }, []);

  // Set default amount when settings load
  useEffect(() => {
    if (!amountPerMember) {
      setAmountPerMember(String(defaultAmount));
    }
  }, [defaultAmount]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('emergency_events')
      .select('*')
      .eq('type', emergencyType)
      .order('created_at', { ascending: false });

    if (!error) setEvents((data || []) as EmergencyEvent[]);
    setIsLoading(false);
  };

  const createEvent = async () => {
    if (!user || !title.trim() || !eventDate || !amountPerMember) {
      toast({ title: 'Missing information', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const amount = Number(amountPerMember);
      const deadline = format(addDays(new Date(eventDate), Number(paymentWindow)), 'yyyy-MM-dd');
      
      const { data: event, error: eventError } = await supabase
        .from('emergency_events')
        .insert({
          type: emergencyType,
          title: title.trim(),
          description: description.trim() || null,
          event_date: eventDate,
          amount_per_member: amount,
          payment_deadline: deadline,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create dues for all active members
      const { data: members } = await supabase
        .from('member_profiles')
        .select('user_id')
        .eq('status', 'active');

      if (members && members.length > 0) {
        const dues = members.map(m => ({
          event_id: event.id,
          member_user_id: m.user_id,
          amount_due: amount,
          amount_paid: 0,
          status: 'unpaid' as const,
        }));
        const { error: duesError } = await supabase.from('emergency_dues').insert(dues);
        if (duesError) throw duesError;
      }

      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: `${emergencyType}_event_created`,
        entity_type: 'emergency_event',
        entity_id: event.id,
        metadata_json: { title: title.trim(), type: emergencyType, amount_per_member: amount, payment_deadline: deadline },
      });

      toast({ title: 'Event created', description: `${typeLabel} dues created for ${members?.length || 0} members` });
      setIsDialogOpen(false);
      setTitle(''); setDescription(''); setEventDate(''); setAmountPerMember(String(defaultAmount)); setPaymentWindow('14');
      fetchEvents();
    } catch (error: any) {
      toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const closeEvent = async (eventId: string) => {
    const { error } = await supabase.from('emergency_events').update({ status: 'closed' }).eq('id', eventId);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event closed' });
      fetchEvents();
    }
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title={`${typeLabel} Events`}
        subtitle={`Manage ${emergencyType} emergency contributions`}
        showBack
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
                <Plus className="h-4 w-4" />New {typeLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create {typeLabel} Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <TypeIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{typeLabel} Emergency Event</span>
                </div>
                <div>
                  <Label htmlFor="title">Event Name</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g., ${typeLabel} support for member`} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="amountPerMember">Contribution Amount per Member (R)</Label>
                  <Input id="amountPerMember" type="number" value={amountPerMember} onChange={e => setAmountPerMember(e.target.value)} placeholder={String(defaultAmount)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input id="eventDate" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="paymentWindow">Payment Window (days)</Label>
                  <Input id="paymentWindow" type="number" value={paymentWindow} onChange={e => setPaymentWindow(e.target.value)} placeholder="14" className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">Default: 14 days from event date</p>
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details..." className="mt-1.5" rows={3} />
                </div>
                <Button onClick={createEvent} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${typeLabel} Event`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-24 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <TypeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No {emergencyType} events</h3>
              <p className="text-sm text-muted-foreground">Create an event when a member needs {emergencyType} support</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event, index) => (
            <Card key={event.id} className="animate-fade-in cursor-pointer hover:border-accent/50 transition-colors" style={{ animationDelay: `${index * 0.05}s` }} onClick={() => navigate(`/admin/emergency-event/${event.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{typeLabel} • {formatDate(event.event_date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={event.status} variant="emergency" />
                </div>
                {event.description && <p className="text-sm text-muted-foreground mb-3">{event.description}</p>}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Per member: </span>
                      <span className="font-semibold">{formatCurrency(Number(event.amount_per_member))}</span>
                    </p>
                    {event.payment_deadline && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />Deadline: {formatDate(event.payment_deadline)}
                      </p>
                    )}
                  </div>
                  {event.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); closeEvent(event.id); }}>Close Event</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
