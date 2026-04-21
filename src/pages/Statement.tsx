import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMemberStatement, StatementEntryType } from '@/hooks/useMemberStatement';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

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

  const selectedMember = useMemo(
    () => members.find((m) => m.user_id === selectedUserId),
    [members, selectedUserId]
  );
  const memberName = selectedMember?.full_name || (selectedUserId === user?.id ? 'My Statement' : 'Member');

  const last = entries && entries.length > 0 ? entries[entries.length - 1] : null;
  const savingsBalance = last?.savings_balance ?? 0;
  const loanBalance = last?.loan_balance ?? 0;
  const netPosition = savingsBalance - loanBalance;

  const handleExportPdf = () => {
    if (!entries || entries.length === 0) {
      toast.error('No data to export');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Hustlers Fund - Mini Statement', 14, 18);
    doc.setFontSize(11);
    doc.text(`Member: ${memberName}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 14, 32);
    doc.text(
      `Savings: ${fmt(savingsBalance)}   Loan Owed: ${fmt(loanBalance)}   Net: ${fmt(netPosition)}`,
      14,
      38
    );

    autoTable(doc, {
      startY: 44,
      head: [['Date', 'Type', 'Description', 'Amount', 'Savings', 'Loan Owed']],
      body: entries.map((e) => [
        new Date(e.entry_date).toLocaleDateString('en-ZA'),
        TYPE_LABEL[e.entry_type],
        e.description || '',
        `${e.amount >= 0 ? '+' : ''}${fmt(e.amount)}`,
        fmt(e.savings_balance),
        fmt(e.loan_balance),
      ]),
      foot: [['', '', 'Closing', '', fmt(savingsBalance), fmt(loanBalance)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [234, 179, 8] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
    });

    doc.save(`statement-${memberName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportCsv = () => {
    if (!entries || entries.length === 0) {
      toast.error('No data to export');
      return;
    }
    const rows = [
      ['Date', 'Type', 'Description', 'Amount', 'Savings Balance', 'Loan Balance'],
      ...entries.map((e) => [
        new Date(e.entry_date).toLocaleDateString('en-ZA'),
        TYPE_LABEL[e.entry_type],
        (e.description || '').replace(/"/g, '""'),
        e.amount.toFixed(2),
        e.savings_balance.toFixed(2),
        e.loan_balance.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${memberName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[1024px] mx-auto px-4 py-6 space-y-4">
        <PageHeader title="Mini Statement" subtitle="Savings and loan balances tracked separately" />

        {isAdmin && (
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
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
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!entries?.length}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!entries?.length}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAdmin && entries && entries.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileText className="h-4 w-4 mr-1" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryTile
            label="Total Savings"
            sublabel="Contributions only"
            value={fmt(savingsBalance)}
            className="text-emerald-600"
          />
          <SummaryTile
            label="Total Loan Owed"
            sublabel="Loans + interest − repayments"
            value={fmt(loanBalance)}
            className="text-rose-600"
          />
          <SummaryTile
            label="Net Position"
            sublabel="Savings − Loan owed"
            value={fmt(netPosition)}
            className={netPosition >= 0 ? 'text-foreground' : 'text-rose-600'}
          />
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
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead className="text-right">Loan Owed</TableHead>
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
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {fmt(e.savings_balance)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-rose-700">
                        {fmt(e.loan_balance)}
                      </TableCell>
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

function SummaryTile({
  label,
  sublabel,
  value,
  className,
}: {
  label: string;
  sublabel?: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        {sublabel && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</div>}
        <div className={`text-xl font-bold mt-2 ${className || ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
