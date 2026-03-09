import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/constants';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

interface LoanExportData {
  applications: any[];
  activeLoans: any[];
  repayments: any[];
  ledgerTxns: any[];
  getName: (id: string) => string;
  metrics: {
    totalApplications: number;
    totalActive: number;
    totalOutstanding: number;
    totalRepaid: number;
    overdueLoans: number;
  };
}

function getDateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export function LoanExportButton({ data }: { data: LoanExportData }) {
  const [isExporting, setIsExporting] = useState(false);
  const { applications, activeLoans, repayments, ledgerTxns, getName, metrics } = data;

  const formatTxnType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();

      // Summary sheet
      const summaryWs = wb.addWorksheet('Summary');
      summaryWs.addRow(['Loan Management Report']);
      summaryWs.addRow(['Generated', formatDateTime(new Date())]);
      summaryWs.addRow([]);
      summaryWs.addRow(['Metric', 'Value']);
      summaryWs.addRow(['Total Applications', metrics.totalApplications]);
      summaryWs.addRow(['Total Active Loans', metrics.totalActive]);
      summaryWs.addRow(['Total Outstanding', metrics.totalOutstanding]);
      summaryWs.addRow(['Total Repaid', metrics.totalRepaid]);
      summaryWs.addRow(['Overdue Loans', metrics.overdueLoans]);
      summaryWs.getColumn(1).width = 25;
      summaryWs.getColumn(2).width = 20;
      summaryWs.getRow(1).font = { bold: true, size: 14 };
      summaryWs.getRow(4).font = { bold: true };

      // Applications sheet
      if (applications.length > 0) {
        const ws = wb.addWorksheet('Applications');
        const header = ws.addRow(['Member', 'Loan Type', 'Requested Amount', 'Request Date', 'Status']);
        header.font = { bold: true };
        header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
        applications.forEach(l => ws.addRow([getName(l.member_user_id), l.type, l.amount, formatDate(l.requested_at), l.status]));
        ws.columns.forEach(col => { col.width = 18; });
      }

      // Active Loans sheet
      if (activeLoans.length > 0) {
        const ws = wb.addWorksheet('Active Loans');
        const header = ws.addRow(['Member', 'Type', 'Principal', 'Interest', 'Total Repayable', 'Outstanding', 'Deadline', 'Status', 'Approved By']);
        header.font = { bold: true };
        header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
        activeLoans.forEach(l => ws.addRow([
          getName(l.member_user_id), l.type, l.amount, l.interest_amount || 0,
          l.total_repayable || 0, l.outstanding_balance,
          l.due_date ? formatDate(l.due_date) : '—', l.status,
          l.approved_by ? getName(l.approved_by) : '—',
        ]));
        ws.columns.forEach(col => { col.width = 16; });
      }

      // Repayments sheet
      if (repayments.length > 0) {
        const ws = wb.addWorksheet('Repayments');
        const header = ws.addRow(['Member', 'Loan Type', 'Amount', 'Payment Date', 'Recorded By']);
        header.font = { bold: true };
        header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
        repayments.forEach(r => ws.addRow([
          r._memberName || '—', r._loanType || '—', r.amount,
          formatDate(r.paid_at), r._recordedByName || '—',
        ]));
        ws.columns.forEach(col => { col.width = 18; });
      }

      // Ledger sheet
      if (ledgerTxns.length > 0) {
        const ws = wb.addWorksheet('Loan Ledger');
        const header = ws.addRow(['Date', 'Member', 'Transaction Type', 'Amount', 'Ref Loan ID']);
        header.font = { bold: true };
        header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; });
        ledgerTxns.forEach(t => ws.addRow([
          formatDate(t.created_at), getName(t.member_user_id),
          formatTxnType(t.transaction_type), t.amount,
          t.reference_id ? t.reference_id.slice(0, 8) : '—',
        ]));
        ws.columns.forEach(col => { col.width = 18; });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `loan-management-${getDateSuffix()}.xlsx`);
      toast.success('Exported as Excel');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      let yPos = 20;

      doc.setFontSize(18);
      doc.text('Loan Management Report', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Generated: ${formatDateTime(new Date())}`, 14, yPos);
      yPos += 12;

      // Summary
      doc.setFontSize(13);
      doc.text('Summary', 14, yPos);
      yPos += 3;
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Applications', String(metrics.totalApplications)],
          ['Total Active Loans', String(metrics.totalActive)],
          ['Total Outstanding', formatCurrency(metrics.totalOutstanding)],
          ['Total Repaid', formatCurrency(metrics.totalRepaid)],
          ['Overdue Loans', String(metrics.overdueLoans)],
        ],
        theme: 'striped',
        styles: { fontSize: 9 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Applications
      if (applications.length > 0) {
        if (yPos > 160) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text('Loan Applications', 14, yPos);
        yPos += 3;
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Type', 'Amount', 'Date', 'Status']],
          body: applications.map(l => [
            getName(l.member_user_id), l.type, formatCurrency(l.amount),
            formatDate(l.requested_at), l.status,
          ]),
          theme: 'striped',
          styles: { fontSize: 8 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
      }

      // Active Loans
      if (activeLoans.length > 0) {
        if (yPos > 140) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text('Active / Approved Loans', 14, yPos);
        yPos += 3;
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Type', 'Principal', 'Interest', 'Repayable', 'Outstanding', 'Deadline', 'Status']],
          body: activeLoans.map(l => [
            getName(l.member_user_id), l.type, formatCurrency(l.amount),
            formatCurrency(l.interest_amount || 0), formatCurrency(l.total_repayable || 0),
            formatCurrency(l.outstanding_balance),
            l.due_date ? formatDate(l.due_date) : '—', l.status,
          ]),
          theme: 'striped',
          styles: { fontSize: 8 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
      }

      // Repayments
      if (repayments.length > 0) {
        if (yPos > 140) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text('Loan Repayments', 14, yPos);
        yPos += 3;
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Type', 'Amount', 'Date', 'Recorded By']],
          body: repayments.map(r => [
            r._memberName || '—', r._loanType || '—',
            formatCurrency(r.amount), formatDate(r.paid_at),
            r._recordedByName || '—',
          ]),
          theme: 'striped',
          styles: { fontSize: 8 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
      }

      // Ledger
      if (ledgerTxns.length > 0) {
        if (yPos > 140) { doc.addPage(); yPos = 20; }
        doc.setFontSize(13);
        doc.text('Loan Transaction Ledger', 14, yPos);
        yPos += 3;
        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Member', 'Type', 'Amount', 'Ref']],
          body: ledgerTxns.map(t => [
            formatDate(t.created_at), getName(t.member_user_id),
            formatTxnType(t.transaction_type), formatCurrency(t.amount),
            t.reference_id ? t.reference_id.slice(0, 8) : '—',
          ]),
          theme: 'striped',
          styles: { fontSize: 8 },
        });
      }

      doc.save(`loan-management-${getDateSuffix()}.pdf`);
      toast.success('Exported as PDF');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
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
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
