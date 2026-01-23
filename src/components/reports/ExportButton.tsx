import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { toast } from 'sonner';
import type { 
  FinancialSummary, 
  MemberBalance, 
  RecentTransaction 
} from '@/hooks/useFinancialReports';

interface ExportButtonProps {
  summary: FinancialSummary | undefined;
  memberBalances: MemberBalance[] | undefined;
  transactions: RecentTransaction[] | undefined;
  paymentsLedger: any[] | undefined;
  loansLedger: any[] | undefined;
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ExportButton({ 
  summary, 
  memberBalances, 
  transactions,
  paymentsLedger,
  loansLedger,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportSummary = () => {
    if (!summary) return;
    
    const csvContent = [
      ['Financial Summary Report', ''],
      ['Generated', formatDateTime(new Date())],
      ['', ''],
      ['Metric', 'Value'],
      ['Pool Balance', formatCurrency(summary.totalPoolBalance)],
      ['Total Contributions', formatCurrency(summary.totalContributions)],
      ['Active Loans', formatCurrency(summary.totalLoansActive)],
      ['Interest Earned', formatCurrency(summary.totalInterestEarned)],
      ['Emergency Dues', formatCurrency(summary.totalEmergencyDues)],
      ['Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
      ['Active Members', summary.activeMembers],
      ['Pending Payments', summary.pendingPayments],
    ].map(row => row.join(',')).join('\n');

    downloadCSV(`financial-summary-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    toast.success('Summary exported successfully');
  };

  const exportMemberBalances = () => {
    if (!memberBalances || memberBalances.length === 0) {
      toast.error('No member data to export');
      return;
    }

    const csvContent = [
      ['Member', 'Total Contributions', 'Outstanding Loans', 'Emergency Dues', 'Net Position'],
      ...memberBalances.map(b => [
        `"${b.fullName}"`,
        b.totalContributions,
        b.outstandingLoans,
        b.emergencyDues,
        b.netPosition,
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(`member-balances-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    toast.success('Member balances exported successfully');
  };

  const exportPaymentsLedger = () => {
    if (!paymentsLedger || paymentsLedger.length === 0) {
      toast.error('No payments data to export');
      return;
    }

    const csvContent = [
      ['Member', 'Amount', 'Method', 'Status', 'Date'],
      ...paymentsLedger.map(p => [
        `"${p.memberName}"`,
        p.total_amount,
        p.method,
        p.status,
        formatDateTime(p.submitted_at),
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(`payments-ledger-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    toast.success('Payments ledger exported successfully');
  };

  const exportLoansLedger = () => {
    if (!loansLedger || loansLedger.length === 0) {
      toast.error('No loans data to export');
      return;
    }

    const csvContent = [
      ['Member', 'Type', 'Amount', 'Interest', 'Outstanding', 'Status', 'Requested'],
      ...loansLedger.map(l => [
        `"${l.memberName}"`,
        l.type,
        l.amount,
        l.interest_amount || 0,
        l.outstanding_balance,
        l.status,
        formatDateTime(l.requested_at),
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(`loans-ledger-${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    toast.success('Loans ledger exported successfully');
  };

  const exportAll = async () => {
    setIsExporting(true);
    try {
      exportSummary();
      await new Promise(r => setTimeout(r, 100));
      exportMemberBalances();
      await new Promise(r => setTimeout(r, 100));
      exportPaymentsLedger();
      await new Promise(r => setTimeout(r, 100));
      exportLoansLedger();
      toast.success('All reports exported successfully');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportSummary}>
          <FileText className="h-4 w-4 mr-2" />
          Financial Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMemberBalances}>
          <FileText className="h-4 w-4 mr-2" />
          Member Balances
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPaymentsLedger}>
          <FileText className="h-4 w-4 mr-2" />
          Payments Ledger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportLoansLedger}>
          <FileText className="h-4 w-4 mr-2" />
          Loans Ledger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAll}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
