import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { useContributionSettings } from '@/hooks/useContributionSettings';
import { EMERGENCY_TYPES, EmergencyType, getEmergencyTypeConfig } from '@/lib/emergencyTypes';
import { 
  Plus, 
  AlertTriangle, 
  Heart, 
  Car, 
  Loader2,
  Calendar
} from 'lucide-react';

interface EmergencyEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  amount_per_member: number;
  status: string;
  created_at: string;
}

export default function AdminEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [eventType, setEventType] = useState<EmergencyType>('funeral');
  const { settings } = useContributionSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('emergency_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  const createEvent = async () => {
    if (!user || !title.trim() || !eventDate) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const typeConfig = getEmergencyTypeConfig(eventType);
      const amountPerMember = settings[typeConfig.settingsKey];

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('emergency_events')
        .insert({
          type: eventType,
          title: title.trim(),
          description: description.trim() || null,
          event_date: eventDate,
          amount_per_member: amountPerMember,
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
        const dues = members.map(member => ({
          event_id: event.id,
          member_user_id: member.user_id,
          amount_due: amountPerMember,
          amount_paid: 0,
          status: 'unpaid' as const,
        }));

        const { error: duesError } = await supabase
          .from('emergency_dues')
          .insert(dues);

        if (duesError) throw duesError;
      }

      toast({
        title: 'Event created',
        description: `Emergency dues created for ${members?.length || 0} active members`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Creation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const closeEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('emergency_events')
      .update({ status: 'closed' })
      .eq('id', eventId);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Event closed',
        description: 'The emergency event has been closed',
      });
      fetchEvents();
    }
  };

  const resetForm = () => {
    setEventType('funeral');
    setTitle('');
    setDescription('');
    setEventDate('');
  };

  const getEventIcon = (type: string) => {
    return type === 'funeral' ? (
      <Heart className="h-5 w-5 text-muted-foreground" />
    ) : (
      <Car className="h-5 w-5 text-warning" />
    );
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader 
        title="Emergency Events" 
        subtitle="Manage emergency contributions"
        showBack
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Emergency Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Event Type</Label>
                  <RadioGroup 
                    value={eventType} 
                    onValueChange={(v) => setEventType(v as 'funeral' | 'accident')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded border hover:border-accent">
                      <RadioGroupItem value="funeral" id="funeral" />
                      <Label htmlFor="funeral" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Heart className="h-4 w-4" />
                        <span>Funeral ({formatCurrency(FUNERAL_CONTRIBUTION)}/member)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded border hover:border-accent">
                      <RadioGroupItem value="accident" id="accident" />
                      <Label htmlFor="accident" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Car className="h-4 w-4" />
                        <span>Accident ({formatCurrency(ACCIDENT_CONTRIBUTION)}/member)</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Support for John's family"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details..."
                    className="mt-1.5"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={createEvent}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create Event'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No emergency events</h3>
              <p className="text-sm text-muted-foreground">
                Create an event when a member needs support
              </p>
            </CardContent>
          </Card>
        ) : (
          events.map((event, index) => (
            <Card 
              key={event.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.type)}
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.type} • {formatDate(event.event_date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={event.status} variant="emergency" />
                </div>

                {event.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Amount per member: </span>
                    <span className="font-semibold">{formatCurrency(Number(event.amount_per_member))}</span>
                  </p>

                  {event.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeEvent(event.id)}
                    >
                      Close Event
                    </Button>
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
