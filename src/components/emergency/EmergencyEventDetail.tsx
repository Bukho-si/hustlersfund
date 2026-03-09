import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Users, UserPlus, CheckCircle, Loader2, Phone, DollarSign, Clock, AlertTriangle, History } from 'lucide-react';

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

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

interface Props {
  eventId: string;
}

function getDueStatus(amountDue: number, amountPaid: number, deadlinePassed: boolean): string {
  if (amountPaid >= amountDue) return 'paid';
  if (deadlinePassed && amountPaid < amountDue) return 'overdue';
  if (amountPaid > 0) return 'partially_paid';
  return 'unpaid';
}

export default function EmergencyEventDetail({ eventId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<EmergencyEvent | null>(null);
  const [dues, setDues] = useState<EmergencyDue[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add external contributor
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalAmount, setExternalAmount] = useState('');
  const [externalNotes, setExternalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Record payment dialog
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<EmergencyDue | null>(null);
  const [recordingContribPaymentFor, setRecordingContribPaymentFor] = useState<Contributor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  // Payment history
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  useEffect(() => { fetchAll(); }, [eventId]);

  const deadlinePassed = event?.payment_deadline 
    ? new Date(event.payment_deadline) < new Date() 
    : false;

  const fetchAll = async () => {
    setIsLoading(true);
    const [eventRes, duesRes, contribRes] = await Promise.all([
      supabase.from('emergency_events').select('*').eq('id', eventId).single(),
      supabase.from('emergency_dues').select('*').eq('event_id', eventId),
      supabase.from('emergency_contributors').select('*').eq('event_id', eventId),
    ]);

    if (eventRes.data) setEvent(eventRes.data as EmergencyEvent);

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
      setExternalName(''); setExternalPhone(''); setExternalAmount(''); setExternalNotes('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordMemberPayment = async () => {
    if (!user || !recordingPaymentFor || !paymentAmount) return;
    const amount = Number(paymentAmount);
    const remaining = Number(recordingPaymentFor.amount_due) - Number(recordingPaymentFor.amount_paid);
    if (amount <= 0 || amount > remaining) {
      toast({ title: 'Invalid amount', description: `Enter between R1 and ${formatCurrency(remaining)}`, variant: 'destructive' });
      return;
    }
    
    setIsRecording(true);
    try {
      const newPaid = Number(recordingPaymentFor.amount_paid) + amount;
      const newStatus = getDueStatus(Number(recordingPaymentFor.amount_due), newPaid, deadlinePassed);
      
      // Update due record
      const { error: updateErr } = await supabase
        .from('emergency_dues')
        .update({ amount_paid: newPaid, status: newStatus as any })
        .eq('id', recordingPaymentFor.id);
      if (updateErr) throw updateErr;

      // Record payment history
      const { error: histErr } = await supabase
        .from('emergency_payment_history')
        .insert({
          due_id: recordingPaymentFor.id,
          event_id: eventId,
          member_user_id: recordingPaymentFor.member_user_id,
          amount,
          recorded_by: user.id,
          notes: paymentNotes.trim() || null,
        });
      if (histErr) throw histErr;

      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'emergency_payment_recorded',
        entity_type: 'emergency_due',
        entity_id: recordingPaymentFor.id,
        metadata_json: { member_user_id: recordingPaymentFor.member_user_id, amount, new_total: newPaid },
      });

      toast({ title: 'Payment recorded', description: `${formatCurrency(amount)} recorded` });
      setRecordingPaymentFor(null);
      setPaymentAmount(''); setPaymentNotes('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsRecording(false);
    }
  };

  const recordContributorPayment = async () => {
    if (!user || !recordingContribPaymentFor || !paymentAmount) return;
    const amount = Number(paymentAmount);
    const remaining = Number(recordingContribPaymentFor.amount_due) - Number(recordingContribPaymentFor.amount_paid);
    if (amount <= 0 || amount > remaining) {
      toast({ title: 'Invalid amount', description: `Enter between R1 and ${formatCurrency(remaining)}`, variant: 'destructive' });
      return;
    }
    
    setIsRecording(true);
    try {
      const newPaid = Number(recordingContribPaymentFor.amount_paid) + amount;
      const newStatus = newPaid >= Number(recordingContribPaymentFor.amount_due) ? 'paid' : 'partially_paid';
      
      const { error: updateErr } = await supabase
        .from('emergency_contributors')
        .update({ amount_paid: newPaid, payment_status: newStatus, recorded_by_admin: user.id })
        .eq('id', recordingContribPaymentFor.id);
      if (updateErr) throw updateErr;

      const { error: histErr } = await supabase
        .from('emergency_contributor_payments')
        .insert({
          contributor_id: recordingContribPaymentFor.id,
          event_id: eventId,
          amount,
          recorded_by: user.id,
          notes: paymentNotes.trim() || null,
        });
      if (histErr) throw histErr;

      toast({ title: 'Payment recorded' });
      setRecordingContribPaymentFor(null);
      setPaymentAmount(''); setPaymentNotes('');
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsRecording(false);
    }
  };

  const fetchPaymentHistory = async (dueId: string) => {
    if (showHistoryFor === dueId) {
      setShowHistoryFor(null);
      return;
    }
    const { data } = await supabase
      .from('emergency_payment_history')
      .select('id, amount, payment_date, notes')
      .eq('due_id', dueId)
      .order('payment_date', { ascending: false });
    setPaymentHistory(data || []);
    setShowHistoryFor(dueId);
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

  const membersPaid = dues.filter(d => Number(d.amount_paid) >= Number(d.amount_due)).length;
  const membersPartial = dues.filter(d => Number(d.amount_paid) > 0 && Number(d.amount_paid) < Number(d.amount_due)).length;
  const membersUnpaid = dues.filter(d => Number(d.amount_paid) === 0).length;
  const externalContribs = contributors.filter(c => c.contributor_type === 'external');
  const externalPaid = externalContribs.filter(c => c.payment_status === 'paid').length;
  const externalUnpaid = externalContribs.filter(c => c.payment_status !== 'paid').length;
  const totalCollected =
    dues.reduce((s, d) => s + Number(d.amount_paid), 0) +
    contributors.reduce((s, c) => s + Number(c.amount_paid), 0);
  const totalExpected =
    dues.reduce((s, d) => s + Number(d.amount_due), 0) +
    contributors.reduce((s, c) => s + Number(c.amount_due), 0);
  const progressPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

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
                  <Label htmlFor="extAmount">Contribution Amount (R)</Label>
                  <Input id="extAmount" type="number" value={externalAmount} onChange={e => setExternalAmount(e.target.value)} placeholder="0" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="extNotes">Notes (optional)</Label>
                  <Textarea id="extNotes" value={externalNotes} onChange={e => setExternalNotes(e.target.value)} placeholder="Any notes..." className="mt-1.5" rows={2} />
                </div>
                <Button onClick={addExternalContributor} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Contributor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Payment Deadline Banner */}
      {event.payment_deadline && (
        <Card className={`mb-4 ${deadlinePassed ? 'bg-destructive/10 border-destructive/30' : 'bg-info/10 border-info/30'}`}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {deadlinePassed ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-info" />}
              <span className="text-sm font-medium">{deadlinePassed ? 'Deadline passed' : 'Payment deadline'}</span>
            </div>
            <span className={`text-sm font-bold ${deadlinePassed ? 'text-destructive' : 'text-info'}`}>
              {formatDate(event.payment_deadline)}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{dues.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="text-xl font-bold text-success">{membersPaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Partial</p>
            <p className="text-xl font-bold text-warning">{membersPartial}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Unpaid</p>
            <p className="text-xl font-bold text-destructive">{membersUnpaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">External</p>
            <p className="text-xl font-bold">{externalContribs.length}</p>
            <p className="text-[10px] text-muted-foreground">{externalPaid} paid / {externalUnpaid} unpaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Collected</span>
            <span className="font-bold">{formatCurrency(totalCollected)} / {formatCurrency(totalExpected)}</span>
          </div>
          <Progress value={progressPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Member Dues */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />Member Contributions ({dues.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {dues.map(due => {
              const remaining = Number(due.amount_due) - Number(due.amount_paid);
              const status = getDueStatus(Number(due.amount_due), Number(due.amount_paid), deadlinePassed);
              return (
                <div key={due.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{due.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(due.amount_paid))} / {formatCurrency(Number(due.amount_due))}
                        {remaining > 0 && <span className="text-warning ml-1">(R{remaining} left)</span>}
                      </p>
                    </div>
                    <StatusBadge status={status} variant="emergency" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {remaining > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs flex-1"
                        onClick={() => {
                          setRecordingPaymentFor(due);
                          setPaymentAmount('');
                          setPaymentNotes('');
                        }}
                      >
                        <DollarSign className="h-3 w-3" />Record Payment
                      </Button>
                    )}
                    {Number(due.amount_paid) > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => fetchPaymentHistory(due.id)}
                      >
                        <History className="h-3 w-3" />History
                      </Button>
                    )}
                  </div>
                  {/* Inline payment history */}
                  {showHistoryFor === due.id && paymentHistory.length > 0 && (
                    <div className="mt-2 ml-2 border-l-2 border-muted pl-3 space-y-1">
                      {paymentHistory.map(ph => (
                        <div key={ph.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{formatCurrency(ph.amount)}</span>
                          {' — '}{formatDate(ph.payment_date)}
                          {ph.notes && <span className="italic ml-1">({ph.notes})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            {externalContribs.map(c => {
              const remaining = Number(c.amount_due) - Number(c.amount_paid);
              return (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.external_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.external_phone && (
                          <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.external_phone}</span>
                        )}
                        <span>{formatCurrency(Number(c.amount_paid))} / {formatCurrency(Number(c.amount_due))}</span>
                      </div>
                    </div>
                    <StatusBadge status={c.payment_status === 'paid' ? 'paid' : c.payment_status === 'partially_paid' ? 'partially_paid' : 'unpaid'} variant="emergency" />
                  </div>
                  {remaining > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs mt-2"
                      onClick={() => {
                        setRecordingContribPaymentFor(c);
                        setPaymentAmount('');
                        setPaymentNotes('');
                      }}
                    >
                      <DollarSign className="h-3 w-3" />Record Payment
                    </Button>
                  )}
                </div>
              );
            })}
            {externalContribs.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No external contributors yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog - Member */}
      <Dialog open={!!recordingPaymentFor} onOpenChange={(open) => { if (!open) setRecordingPaymentFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {recordingPaymentFor?.memberName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-medium">{formatCurrency(Number(recordingPaymentFor?.amount_due || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-success">{formatCurrency(Number(recordingPaymentFor?.amount_paid || 0))}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-medium">Remaining</span>
                <span className="font-bold text-warning">{formatCurrency(Number(recordingPaymentFor?.amount_due || 0) - Number(recordingPaymentFor?.amount_paid || 0))}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="payAmount">Amount Paid (R)</Label>
              <Input
                id="payAmount"
                type="number"
                step="0.01"
                min="1"
                max={Number(recordingPaymentFor?.amount_due || 0) - Number(recordingPaymentFor?.amount_paid || 0)}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="payNotes">Notes (optional)</Label>
              <Textarea id="payNotes" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Payment reference..." className="mt-1.5" rows={2} />
            </div>
            <Button onClick={recordMemberPayment} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isRecording || !paymentAmount}>
              {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : `Record ${paymentAmount ? formatCurrency(Number(paymentAmount)) : 'Payment'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog - External */}
      <Dialog open={!!recordingContribPaymentFor} onOpenChange={(open) => { if (!open) setRecordingContribPaymentFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {recordingContribPaymentFor?.external_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="font-medium">{formatCurrency(Number(recordingContribPaymentFor?.amount_due || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-success">{formatCurrency(Number(recordingContribPaymentFor?.amount_paid || 0))}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-medium">Remaining</span>
                <span className="font-bold text-warning">{formatCurrency(Number(recordingContribPaymentFor?.amount_due || 0) - Number(recordingContribPaymentFor?.amount_paid || 0))}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="contribPayAmount">Amount Paid (R)</Label>
              <Input
                id="contribPayAmount"
                type="number"
                step="0.01"
                min="1"
                max={Number(recordingContribPaymentFor?.amount_due || 0) - Number(recordingContribPaymentFor?.amount_paid || 0)}
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contribPayNotes">Notes (optional)</Label>
              <Textarea id="contribPayNotes" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Payment reference..." className="mt-1.5" rows={2} />
            </div>
            <Button onClick={recordContributorPayment} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isRecording || !paymentAmount}>
              {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : `Record ${paymentAmount ? formatCurrency(Number(paymentAmount)) : 'Payment'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
