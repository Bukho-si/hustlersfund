import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useMemberStatement, StatementEntryType } from '@/hooks/useMemberStatement';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const TYPE_STYLES: Record<StatementEntryType, string> = {
  contribution: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  loan: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  repayment: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  interest: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
};

const TYPE_LABEL: Record<StatementEntryType, string> = {
  contribution: 'Contribution',
  loan: 'Loan',
  repayment: 'Repayment',
  interest: 'Interest',
};

const fmt = (n: number) =>
  `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Statement() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(user?.id);
  const [members, setMembers] = useState<{ user_id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (user && !selectedUserId) setSelectedUserId(user.id);
  }, [user, selectedUserId]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('member_profiles')
      .select('user_id, full_name')
      .order('full_name')
      .then(({ data }) => setMembers(data || []));
  }, [isAdmin]);

  const { data: entries, isLoading, error } = useMemberStatement(selectedUserId);

  const totals = useMemo(() => {
    const t = { contribution: 0, loan: 0, repayment: 0, interest: 0 };
    entries?.forEach((e) => {
      t[e.entry_type] += Math.abs(e.amount);
    });
    return t;
  }, [entries]);

  const closingBalance = entries && entries.length > 0 ? entries[entries.length - 1].balance : 0;

  return (
    <AppLayout>
      <div className="w-full max-w-[1024px] mx-auto px-4 py-6 space-y-4">
        <PageHeader title="Mini Statement" subtitle="Full financial activity with running balance" />

        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-medium mb-2 block">Select member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryTile label="Contributions" value={fmt(totals.contribution)} className="text-emerald-600" />
          <SummaryTile label="Loans" value={fmt(totals.loan)} className="text-blue-600" />
          <SummaryTile label="Repayments" value={fmt(totals.repayment)} className="text-rose-600" />
          <SummaryTile label="Interest" value={fmt(totals.interest)} className="text-amber-600" />
          <SummaryTile label="Balance" value={fmt(closingBalance)} className="text-foreground font-bold" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-destructive text-sm">
                Failed to load statement: {(error as Error).message}
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No financial activity yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(e.entry_date).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_STYLES[e.entry_type]}>
                          {TYPE_LABEL[e.entry_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.description}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          e.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {e.amount >= 0 ? '+' : ''}
                        {fmt(e.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmt(e.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function SummaryTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-lg font-semibold mt-1 ${className || ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
