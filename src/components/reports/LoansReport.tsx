import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/constants';
import { CreditCard, TrendingUp, Percent, AlertTriangle, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DateRangeFilter } from './DateRangeFilter';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface LoanEntry {
  id: string;
  memberName: string;
  type: string;
  amount: number;
  interestRate: number;
  interestAmount: number;
  totalRepayable: number;
  outstandingBalance: number;
  status: string;
  requestedAt: string;
  repaymentPeriod: string | null;
  totalRepaid: number;
}

function useLoansReportData() {
  return useQuery({
    queryKey: ['loans-report'],
    queryFn: async () => {
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .order('requested_at', { ascending: false });

      if (!loans) return { loans: [] };

      const memberIds = [...new Set(loans.map(l => l.member_user_id))];
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const loanIds = loans.map(l => l.id);
      const { data: repayments } = await supabase
        .from('loan_repayments')
        .select('loan_id, amount')
        .in('loan_id', loanIds);

      const repaymentMap = new Map<string, number>();
      repayments?.forEach(r => {
        repaymentMap.set(r.loan_id, (repaymentMap.get(r.loan_id) || 0) + Number(r.amount));
      });

      const mapped: LoanEntry[] = loans.map(l => ({
        id: l.id,
        memberName: profileMap.get(l.member_user_id) || 'Unknown',
        type: l.type,
        amount: Number(l.amount),
        interestRate: Number(l.interest_rate_percent || 0),
        interestAmount: Number(l.interest_amount || 0),
        totalRepayable: Number(l.total_repayable || l.amount),
        outstandingBalance: Number(l.outstanding_balance),
        status: l.status,
        requestedAt: l.requested_at,
        repaymentPeriod: l.repayment_period,
        totalRepaid: repaymentMap.get(l.id) || 0,
      }));

      return { loans: mapped };
    },
    refetchInterval: 30000,
  });
}

interface LoansReportProps {
  loanTypeFilter?: 'petrol' | 'personal';
}

export function LoansReport({ loanTypeFilter }: LoansReportProps = {}) {
  const { data, isLoading } = useLoansReportData();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    let all = data?.loans || [];
    if (loanTypeFilter) {
      all = all.filter(l => l.type === loanTypeFilter);
    }
    return all.filter(l => {
      const d = new Date(l.requestedAt);
      if (fromDate && d < startOfDay(fromDate)) return false;
      if (toDate && d > endOfDay(toDate)) return false;
      return true;
    });
  }, [data?.loans, fromDate, toDate, loanTypeFilter]);

  const summary = useMemo(() => {
    const approved = filtered.filter(l => l.status === 'approved');
    return {
      totalDisbursed: approved.reduce((s, l) => s + l.amount, 0),
      totalOutstanding: approved.reduce((s, l) => s + l.outstandingBalance, 0),
      totalInterest: approved.reduce((s, l) => s + l.interestAmount, 0),
      petrolCount: filtered.filter(l => l.type === 'petrol').length,
      personalCount: filtered.filter(l => l.type === 'personal').length,
      pendingCount: filtered.filter(l => l.status === 'pending').length,
    };
  }, [filtered]);

  const getDateSuffix = () => new Date().toISOString().split('T')[0];

  const exportCSV = useCallback(() => {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    const rows = [
      ['Member', 'Type', 'Amount', 'Interest Rate', 'Interest Amount', 'Total Repayable', 'Repaid', 'Outstanding', 'Status', 'Repayment Period', 'Requested'],
      ...filtered.map(l => [
        l.memberName, l.type, l.amount, `${l.interestRate}%`, l.interestAmount, l.totalRepayable, l.totalRepaid, l.outstandingBalance, l.status, l.repaymentPeriod || '', formatDateTime(l.requestedAt),
      ]),
    ];
    const blob = new Blob([rows.map(r => csvRow(r)).join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `loans-report-${getDateSuffix()}.csv`);
    toast.success('Loans exported as CSV');
  }, [filtered]);

  const exportExcel = useCallback(async () => {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Loans');
    ws.addRow(['Loans Report']);
    ws.addRow(['Generated', formatDateTime(new Date())]);
    ws.addRow(['Total Disbursed', summary.totalDisbursed, '', 'Outstanding', summary.totalOutstanding, '', 'Interest Earned', summary.totalInterest]);
    ws.addRow([]);
    const headerRow = ws.addRow(['Member', 'Type', 'Amount', 'Interest Rate', 'Interest Amount', 'Total Repayable', 'Repaid', 'Outstanding', 'Status', 'Period', 'Requested']);
    headerRow.eachCell(cell => { cell.font = { bold: true }; });
    filtered.forEach(l => ws.addRow([l.memberName, l.type, l.amount, `${l.interestRate}%`, l.interestAmount, l.totalRepayable, l.totalRepaid, l.outstandingBalance, l.status, l.repaymentPeriod || '', formatDateTime(l.requestedAt)]));
    ws.columns.forEach(col => { col.width = 16; });
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `loans-report-${getDateSuffix()}.xlsx`);
    toast.success('Loans exported as Excel');
  }, [filtered, summary]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  const cards = [
    { label: 'Total Disbursed', value: formatCurrency(summary.totalDisbursed), icon: CreditCard, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding), icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Interest Earned', value: formatCurrency(summary.totalInterest), icon: Percent, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Petrol / Personal', value: `${summary.petrolCount} / ${summary.personalCount}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Filter + Export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <DateRangeFilter from={fromDate} to={toDate} onFromChange={setFromDate} onToChange={setToDate} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCSV}>
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            All Loans
            <span className="ml-2 text-xs font-normal text-muted-foreground">({filtered.length} records)</span>
            {summary.pendingCount > 0 && (
              <Badge variant="outline" className="ml-2 text-warning border-warning">{summary.pendingCount} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.length > 0 ? filtered.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{l.memberName}</p>
                    <Badge variant="secondary" className="text-[10px] capitalize">{l.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(l.requestedAt)}
                    {l.repaymentPeriod && ` • ${l.repaymentPeriod}`}
                    {` • ${l.interestRate}% interest`}
                  </p>
                  {l.status === 'approved' && l.outstandingBalance > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">Repaid: {formatCurrency(l.totalRepaid)}</span>
                        <span className="text-muted-foreground">/ {formatCurrency(l.totalRepayable)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-0.5">
                        <div
                          className="h-full bg-success rounded-full transition-all"
                          style={{ width: `${Math.min(100, (l.totalRepaid / l.totalRepayable) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-semibold">{formatCurrency(l.amount)}</p>
                  {l.status === 'approved' && l.outstandingBalance > 0 && (
                    <p className="text-[10px] text-warning">Bal: {formatCurrency(l.outstandingBalance)}</p>
                  )}
                  <StatusBadge status={l.status} variant="loan" />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-muted-foreground text-sm">No loans found for this period</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
