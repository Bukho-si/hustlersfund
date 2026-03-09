import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { type LedgerEntry, getTransactionLabel } from '@/hooks/useFinancialLedger';

interface LedgerExportButtonProps {
  entries: LedgerEntry[] | undefined;
}

function getDateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export function LedgerExportButton({ entries }: LedgerExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!entries || entries.length === 0) return null;

  const exportCSV = () => {
    const rows = [
      ['Date', 'Member', 'Type', 'Amount', 'Description'],
      ...entries.map(e => [
        formatDateTime(e.created_at),
        `"${e.memberName || ''}"`,
        getTransactionLabel(e.transaction_type),
        e.amount,
        `"${e.description || ''}"`,
      ]),
    ].map(r => r.join(',')).join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `financial-ledger-${getDateSuffix()}.csv`);
    toast.success('Ledger exported as CSV');
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Financial Ledger');
      ws.addRow(['Date', 'Member', 'Type', 'Amount', 'Description']);
      entries.forEach(e => ws.addRow([
        formatDateTime(e.created_at),
        e.memberName || '',
        getTransactionLabel(e.transaction_type),
        e.amount,
        e.description || '',
      ]));
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `financial-ledger-${getDateSuffix()}.xlsx`);
      toast.success('Ledger exported as Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Financial Ledger', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Member', 'Type', 'Amount']],
      body: entries.map(e => [
        formatDateTime(e.created_at),
        e.memberName || '',
        getTransactionLabel(e.transaction_type),
        formatCurrency(e.amount),
      ]),
      theme: 'striped',
    });

    doc.save(`financial-ledger-${getDateSuffix()}.pdf`);
    toast.success('Ledger exported as PDF');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export Ledger
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4 mr-2" />CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>
          <File className="h-4 w-4 mr-2" />PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
