import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import { Users, UserPlus, CheckCircle, AlertTriangle, Loader2, Phone } from 'lucide-react';

interface EmergencyEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  amount_per_member: number;
  status: string;
}

interface Contributor {
  id: string;
  event_id: string;
  member_user_id: string | null;
  external_name: string | null;
  external_phone: string | null;
  contributor_type: string;
  amount_due: number;
  amount_paid: number;
  payment_status: string;
  recorded_by_admin: string | null;
  memberName?: string;
}

interface EmergencyDue {
  id: string;
  event_id: string;
  member_user_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  memberName?: string;
}

interface Props {
  eventId: string;
}

export default function EmergencyEventDetail({ eventId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EmergencyEvent | null>(null);
  const [dues, setDues] = useState<EmergencyDue[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalAmount, setExternalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingDueId, setMarkingDueId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [eventId]);

  const fetchAll = async () => {
    setIsLoading(true);
    const [eventRes, duesRes, contribRes] = await Promise.all([
      supabase.from('emergency_events').select('*').eq('id', eventId).single(),
      supabase.from('emergency_dues').select('*').eq('event_id', eventId),
      supabase.from('emergency_contributors').select('*').eq('event_id', eventId),
    ]);

    if (eventRes.data) setEvent(eventRes.data);

    // Fetch member names for dues
    const duesData = duesRes.data || [];
    const memberIds = [...new Set([
      ...duesData.map(d => d.member_user_id),
      ...(contribRes.data || []).filter(c => c.member_user_id).map(c => c.member_user_id!),
    ])];

    let nameMap: Record<string, string> = {};
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);
      profiles?.forEach(p => { nameMap[p.user_id] = p.full_name; });
    }

    setDues(duesData.map(d => ({ ...d, memberName: nameMap[d.member_user_id] || 'Unknown' })));
    setContributors((contribRes.data || []).map(c => ({
      ...c,
      memberName: c.member_user_id ? nameMap[c.member_user_id] || 'Unknown' : undefined,
    })));
    setIsLoading(false);
  };

  const addExternalContributor = async () => {
    if (!user || !externalName.trim() || !externalAmount) {
      toast({ title: 'Missing info', description: 'Name and amount are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('emergency_contributors').insert({
        event_id: eventId,
        contributor_type: 'external',
        external_name: externalName.trim(),
        external_phone: externalPhone.trim() || null,
        amount_due: Number(externalAmount),
        amount_paid: 0,
        payment_status: 'unpaid',
        recorded_by_admin: user.id,
      });
      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'external_contributor_added',
        entity_type: 'emergency_contributor',
        entity_id: eventId,
        metadata_json: { name: externalName.trim(), amount: Number(externalAmount) },
      });

      toast({ title: 'Contributor added' });
      setIsAddingExternal(false);
      setExternalName(''); setExternalPhone(''); setExternalAmount('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markDuePaid = async (dueId: string, memberId: string, amount: number) => {
    if (!user) return;
    setMarkingDueId(dueId);
    try {
      const { error } = await supabase
        .from('emergency_dues')
        .update({ amount_paid: amount, status: 'paid' })
        .eq('id', dueId);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'emergency_payment_recorded',
        entity_type: 'emergency_due',
        entity_id: dueId,
        metadata_json: { member_user_id: memberId, amount },
      });

      toast({ title: 'Payment recorded' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setMarkingDueId(null);
    }
  };

  const markContributorPaid = async (contrib: Contributor) => {
    if (!user) return;
    setMarkingPaidId(contrib.id);
    try {
      const { error } = await supabase
        .from('emergency_contributors')
        .update({ amount_paid: contrib.amount_due, payment_status: 'paid', recorded_by_admin: user.id })
        .eq('id', contrib.id);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'emergency_payment_recorded',
        entity_type: 'emergency_contributor',
        entity_id: contrib.id,
        metadata_json: { name: contrib.external_name || contrib.memberName, amount: contrib.amount_due },
      });

      toast({ title: 'Payment recorded' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setMarkingPaidId(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout requireAdmin>
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout requireAdmin>
        <PageHeader title="Event Not Found" showBack />
      </AppLayout>
    );
  }

  const membersPaid = dues.filter(d => d.status === 'paid').length;
  const membersUnpaid = dues.filter(d => d.status === 'unpaid').length;
  const externalContribs = contributors.filter(c => c.contributor_type === 'external');
  const totalCollected =
    dues.reduce((s, d) => s + Number(d.amount_paid), 0) +
    contributors.reduce((s, c) => s + Number(c.amount_paid), 0);
  const totalExpected =
    dues.reduce((s, d) => s + Number(d.amount_due), 0) +
    contributors.reduce((s, c) => s + Number(c.amount_due), 0);
  const remaining = totalExpected - totalCollected;

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title={event.title}
        subtitle={`${event.type === 'funeral' ? 'Funeral' : 'Accident'} Emergency`}
        showBack
        action={
          <Dialog open={isAddingExternal} onOpenChange={setIsAddingExternal}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
                <UserPlus className="h-4 w-4" />External
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add External Contributor</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="extName">Name *</Label>
                  <Input id="extName" value={externalName} onChange={e => setExternalName(e.target.value)} placeholder="Full name" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="extPhone">Phone</Label>
                  <Input id="extPhone" value={externalPhone} onChange={e => setExternalPhone(e.target.value)} placeholder="Phone number" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="extAmount">Amount (R)</Label>
                  <Input id="extAmount" type="number" value={externalAmount} onChange={e => setExternalAmount(e.target.value)} placeholder="0" className="mt-1.5" />
                </div>
                <Button onClick={addExternalContributor} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Contributor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="text-2xl font-bold">{dues.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Members Paid</p>
            <p className="text-2xl font-bold text-success">{membersPaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Members Unpaid</p>
            <p className="text-2xl font-bold text-warning">{membersUnpaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">External</p>
            <p className="text-2xl font-bold">{externalContribs.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-xl font-bold text-success">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold text-warning">{formatCurrency(remaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Dues */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />Member Contributions ({dues.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {dues.map(due => (
              <div key={due.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{due.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(due.amount_paid))} / {formatCurrency(Number(due.amount_due))}
                  </p>
                </div>
                {due.status === 'paid' ? (
                  <StatusBadge status="paid" variant="emergency" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    disabled={markingDueId === due.id}
                    onClick={() => markDuePaid(due.id, due.member_user_id, Number(due.amount_due))}
                  >
                    {markingDueId === due.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Mark Paid
                  </Button>
                )}
              </div>
            ))}
            {dues.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No member dues</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* External Contributors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />External Contributors ({externalContribs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {externalContribs.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.external_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.external_phone && (
                      <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.external_phone}</span>
                    )}
                    <span>{formatCurrency(Number(c.amount_due))}</span>
                  </div>
                </div>
                {c.payment_status === 'paid' ? (
                  <StatusBadge status="paid" variant="emergency" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    disabled={markingPaidId === c.id}
                    onClick={() => markContributorPaid(c)}
                  >
                    {markingPaidId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    Mark Paid
                  </Button>
                )}
              </div>
            ))}
            {externalContribs.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No external contributors yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
