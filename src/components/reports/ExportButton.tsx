import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, File, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
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

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'word';

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

function getDateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export function ExportButton({ 
  summary, 
  memberBalances, 
  transactions,
  paymentsLedger,
  loansLedger,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  // CSV Export Functions
  const exportSummaryCSV = () => {
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

    downloadCSV(`financial-summary-${getDateSuffix()}.csv`, csvContent);
    toast.success('Summary exported as CSV');
  };

  const exportMemberBalancesCSV = () => {
    if (!memberBalances || memberBalances.length === 0) {
      toast.error('No member data to export');
      return;
    }

    const csvContent = [
      ['Member', 'Slots', 'Joining Fee Paid', 'Total Contributions', 'Outstanding Loans', 'Emergency Dues', 'Net Position'],
      ...memberBalances.map(b => [
        `"${b.fullName}"`,
        b.membershipSlots,
        b.joiningFeePaidTotal,
        b.totalContributions,
        b.outstandingLoans,
        b.emergencyDues,
        b.netPosition,
      ])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(`member-balances-${getDateSuffix()}.csv`, csvContent);
    toast.success('Member balances exported as CSV');
  };

  // Excel Export Functions
  const exportToExcel = (type: 'summary' | 'members' | 'payments' | 'loans' | 'all') => {
    const wb = XLSX.utils.book_new();

    if (type === 'summary' || type === 'all') {
      if (summary) {
        const summaryData = [
          ['Financial Summary Report'],
          ['Generated', formatDateTime(new Date())],
          [''],
          ['Metric', 'Value'],
          ['Pool Balance', summary.totalPoolBalance],
          ['Total Contributions', summary.totalContributions],
          ['Active Loans', summary.totalLoansActive],
          ['Interest Earned', summary.totalInterestEarned],
          ['Emergency Dues', summary.totalEmergencyDues],
          ['Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
          ['Active Members', summary.activeMembers],
          ['Pending Payments', summary.pendingPayments],
        ];
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      }
    }

    if (type === 'members' || type === 'all') {
      if (memberBalances && memberBalances.length > 0) {
        const membersData = [
          ['Member', 'Slots', 'Joining Fee Paid', 'Total Contributions', 'Outstanding Loans', 'Emergency Dues', 'Net Position'],
          ...memberBalances.map(b => [b.fullName, b.membershipSlots, b.joiningFeePaidTotal, b.totalContributions, b.outstandingLoans, b.emergencyDues, b.netPosition])
        ];
        const ws = XLSX.utils.aoa_to_sheet(membersData);
        XLSX.utils.book_append_sheet(wb, ws, 'Member Balances');
      }
    }

    if (type === 'payments' || type === 'all') {
      if (paymentsLedger && paymentsLedger.length > 0) {
        const paymentsData = [
          ['Member', 'Amount', 'Method', 'Status', 'Date'],
          ...paymentsLedger.map(p => [p.memberName, p.total_amount, p.method, p.status, formatDateTime(p.submitted_at)])
        ];
        const ws = XLSX.utils.aoa_to_sheet(paymentsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
      }
    }

    if (type === 'loans' || type === 'all') {
      if (loansLedger && loansLedger.length > 0) {
        const loansData = [
          ['Member', 'Type', 'Amount', 'Interest', 'Outstanding', 'Status', 'Requested'],
          ...loansLedger.map(l => [l.memberName, l.type, l.amount, l.interest_amount || 0, l.outstanding_balance, l.status, formatDateTime(l.requested_at)])
        ];
        const ws = XLSX.utils.aoa_to_sheet(loansData);
        XLSX.utils.book_append_sheet(wb, ws, 'Loans');
      }
    }

    const filename = type === 'all' ? `financial-reports-${getDateSuffix()}.xlsx` : `${type}-${getDateSuffix()}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Exported as Excel`);
  };

  // PDF Export Functions
  const exportToPDF = (type: 'summary' | 'members' | 'payments' | 'loans' | 'all') => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Financial Report', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 14, yPos);
    yPos += 15;

    if (type === 'summary' || type === 'all') {
      if (summary) {
        doc.setFontSize(14);
        doc.text('Financial Summary', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: [
            ['Pool Balance', formatCurrency(summary.totalPoolBalance)],
            ['Total Contributions', formatCurrency(summary.totalContributions)],
            ['Active Loans', formatCurrency(summary.totalLoansActive)],
            ['Interest Earned', formatCurrency(summary.totalInterestEarned)],
            ['Emergency Dues', formatCurrency(summary.totalEmergencyDues)],
            ['Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
            ['Active Members', String(summary.activeMembers)],
            ['Pending Payments', String(summary.pendingPayments)],
          ],
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'members' || type === 'all') {
      if (memberBalances && memberBalances.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Member Balances', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Slots', 'Contributions', 'Loans', 'Net Position']],
          body: memberBalances.map(b => [
            b.fullName,
            String(b.membershipSlots),
            formatCurrency(b.totalContributions),
            formatCurrency(b.outstandingLoans),
            formatCurrency(b.netPosition),
          ]),
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'payments' || type === 'all') {
      if (paymentsLedger && paymentsLedger.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Payments Ledger', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Amount', 'Method', 'Status', 'Date']],
          body: paymentsLedger.slice(0, 50).map(p => [
            p.memberName,
            formatCurrency(p.total_amount),
            p.method,
            p.status,
            formatDateTime(p.submitted_at),
          ]),
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'loans' || type === 'all') {
      if (loansLedger && loansLedger.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Loans Ledger', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Type', 'Amount', 'Outstanding', 'Status']],
          body: loansLedger.slice(0, 50).map(l => [
            l.memberName,
            l.type,
            formatCurrency(l.amount),
            formatCurrency(l.outstanding_balance),
            l.status,
          ]),
          theme: 'striped',
        });
      }
    }

    const filename = type === 'all' ? `financial-reports-${getDateSuffix()}.pdf` : `${type}-${getDateSuffix()}.pdf`;
    doc.save(filename);
    toast.success('Exported as PDF');
  };

  // Word Export Functions
  const exportToWord = async (type: 'summary' | 'members' | 'payments' | 'loans' | 'all') => {
    const sections: any[] = [];

    // Title
    sections.push(
      new Paragraph({
        text: 'Financial Report',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [new TextRun({ text: `Generated: ${formatDateTime(new Date())}`, italics: true })],
      }),
      new Paragraph({ text: '' })
    );

    if (type === 'summary' || type === 'all') {
      if (summary) {
        sections.push(
          new Paragraph({ text: 'Financial Summary', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Metric', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })] }),
                ],
              }),
              ...([
                ['Pool Balance', formatCurrency(summary.totalPoolBalance)],
                ['Total Contributions', formatCurrency(summary.totalContributions)],
                ['Active Loans', formatCurrency(summary.totalLoansActive)],
                ['Interest Earned', formatCurrency(summary.totalInterestEarned)],
                ['Emergency Dues', formatCurrency(summary.totalEmergencyDues)],
                ['Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
                ['Active Members', String(summary.activeMembers)],
                ['Pending Payments', String(summary.pendingPayments)],
              ] as [string, string][]).map(([metric, value]) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(metric)] }),
                    new TableCell({ children: [new Paragraph(value)] }),
                  ],
                })
              ),
            ],
          }),
          new Paragraph({ text: '' })
        );
      }
    }

    if (type === 'members' || type === 'all') {
      if (memberBalances && memberBalances.length > 0) {
        sections.push(
          new Paragraph({ text: 'Member Balances', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Member', 'Slots', 'Contributions', 'Loans', 'Net Position'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                ),
              }),
              ...memberBalances.map(b =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(b.fullName)] }),
                    new TableCell({ children: [new Paragraph(String(b.membershipSlots))] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(b.totalContributions))] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(b.outstandingLoans))] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(b.netPosition))] }),
                  ],
                })
              ),
            ],
          }),
          new Paragraph({ text: '' })
        );
      }
    }

    if (type === 'payments' || type === 'all') {
      if (paymentsLedger && paymentsLedger.length > 0) {
        sections.push(
          new Paragraph({ text: 'Payments Ledger', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Member', 'Amount', 'Method', 'Status', 'Date'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                ),
              }),
              ...paymentsLedger.slice(0, 50).map(p =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(p.memberName)] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(p.total_amount))] }),
                    new TableCell({ children: [new Paragraph(p.method)] }),
                    new TableCell({ children: [new Paragraph(p.status)] }),
                    new TableCell({ children: [new Paragraph(formatDateTime(p.submitted_at))] }),
                  ],
                })
              ),
            ],
          }),
          new Paragraph({ text: '' })
        );
      }
    }

    if (type === 'loans' || type === 'all') {
      if (loansLedger && loansLedger.length > 0) {
        sections.push(
          new Paragraph({ text: 'Loans Ledger', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Member', 'Type', 'Amount', 'Outstanding', 'Status'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                ),
              }),
              ...loansLedger.slice(0, 50).map(l =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(l.memberName)] }),
                    new TableCell({ children: [new Paragraph(l.type)] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(l.amount))] }),
                    new TableCell({ children: [new Paragraph(formatCurrency(l.outstanding_balance))] }),
                    new TableCell({ children: [new Paragraph(l.status)] }),
                  ],
                })
              ),
            ],
          })
        );
      }
    }

    const doc = new Document({
      sections: [{ children: sections }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = type === 'all' ? `financial-reports-${getDateSuffix()}.docx` : `${type}-${getDateSuffix()}.docx`;
    saveAs(blob, filename);
    toast.success('Exported as Word document');
  };

  const exportAll = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportSummaryCSV();
          await new Promise(r => setTimeout(r, 100));
          exportMemberBalancesCSV();
          break;
        case 'excel':
          exportToExcel('all');
          break;
        case 'pdf':
          exportToPDF('all');
          break;
        case 'word':
          await exportToWord('all');
          break;
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Print Functions - generate PDF and open print dialog
  const printReport = (type: 'summary' | 'members' | 'payments' | 'loans' | 'all') => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Financial Report', 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 14, yPos);
    yPos += 15;

    if (type === 'summary' || type === 'all') {
      if (summary) {
        doc.setFontSize(14);
        doc.text('Financial Summary', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: [
            ['Pool Balance', formatCurrency(summary.totalPoolBalance)],
            ['Total Contributions', formatCurrency(summary.totalContributions)],
            ['Active Loans', formatCurrency(summary.totalLoansActive)],
            ['Interest Earned', formatCurrency(summary.totalInterestEarned)],
            ['Emergency Dues', formatCurrency(summary.totalEmergencyDues)],
            ['Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
            ['Active Members', String(summary.activeMembers)],
            ['Pending Payments', String(summary.pendingPayments)],
          ],
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'members' || type === 'all') {
      if (memberBalances && memberBalances.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Member Balances', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Slots', 'Contributions', 'Loans', 'Net Position']],
          body: memberBalances.map(b => [
            b.fullName,
            String(b.membershipSlots),
            formatCurrency(b.totalContributions),
            formatCurrency(b.outstandingLoans),
            formatCurrency(b.netPosition),
          ]),
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'payments' || type === 'all') {
      if (paymentsLedger && paymentsLedger.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Payments Ledger', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Amount', 'Method', 'Status', 'Date']],
          body: paymentsLedger.slice(0, 50).map(p => [
            p.memberName,
            formatCurrency(p.total_amount),
            p.method,
            p.status,
            formatDateTime(p.submitted_at),
          ]),
          theme: 'striped',
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (type === 'loans' || type === 'all') {
      if (loansLedger && loansLedger.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text('Loans Ledger', 14, yPos);
        yPos += 5;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Type', 'Amount', 'Outstanding', 'Status']],
          body: loansLedger.slice(0, 50).map(l => [
            l.memberName,
            l.type,
            formatCurrency(l.amount),
            formatCurrency(l.outstanding_balance),
            l.status,
          ]),
          theme: 'striped',
        });
      }
    }

    // Open print dialog instead of saving
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success('Print dialog opened');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* CSV Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={exportSummaryCSV}>
              Financial Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportMemberBalancesCSV}>
              Member Balances
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Excel Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => exportToExcel('summary')}>
              Financial Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel('members')}>
              Member Balances
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel('payments')}>
              Payments Ledger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel('loans')}>
              Loans Ledger
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportToExcel('all')}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* PDF Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <File className="h-4 w-4 mr-2" />
            PDF
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => exportToPDF('summary')}>
              Financial Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF('members')}>
              Member Balances
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF('payments')}>
              Payments Ledger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF('loans')}>
              Loans Ledger
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportToPDF('all')}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Word Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4 mr-2" />
            Word
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => exportToWord('summary')}>
              Financial Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToWord('members')}>
              Member Balances
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToWord('payments')}>
              Payments Ledger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToWord('loans')}>
              Loans Ledger
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportToWord('all')}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Print Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => printReport('summary')}>
              Financial Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printReport('members')}>
              Member Balances
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printReport('payments')}>
              Payments Ledger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => printReport('loans')}>
              Loans Ledger
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => printReport('all')}>
              <Printer className="h-4 w-4 mr-2" />
              Print All Reports
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Quick Export All */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="h-4 w-4 mr-2" />
            Export All As...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => exportAll('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAll('pdf')}>
              <File className="h-4 w-4 mr-2" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAll('word')}>
              <FileText className="h-4 w-4 mr-2" />
              Word (.docx)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
