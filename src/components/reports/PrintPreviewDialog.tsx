import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Edit2, Eye } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import type { 
  FinancialSummary, 
  MemberBalance 
} from '@/hooks/useFinancialReports';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'summary' | 'members' | 'payments' | 'loans' | 'all';
  summary: FinancialSummary | undefined;
  memberBalances: MemberBalance[] | undefined;
  paymentsLedger: any[] | undefined;
  loansLedger: any[] | undefined;
}

interface EditableField {
  label: string;
  value: string;
  key: string;
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  type,
  summary,
  memberBalances,
  paymentsLedger,
  loansLedger,
}: PrintPreviewDialogProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [reportTitle, setReportTitle] = useState('Financial Report');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);

  // Calculate total amount collected
  const totalAmountCollected = paymentsLedger?.reduce(
    (sum, p) => p.status === 'verified' ? sum + Number(p.total_amount) : sum,
    0
  ) || 0;

  // Initialize editable fields based on summary
  useEffect(() => {
    if (summary) {
      setEditableFields([
        { label: 'Pool Balance', value: formatCurrency(summary.totalPoolBalance), key: 'poolBalance' },
        { label: 'Total Contributions', value: formatCurrency(summary.totalContributions), key: 'contributions' },
        { label: 'Active Loans', value: formatCurrency(summary.totalLoansActive), key: 'activeLoans' },
        { label: 'Interest Earned', value: formatCurrency(summary.totalInterestEarned), key: 'interestEarned' },
        { label: 'Emergency Dues', value: formatCurrency(summary.totalEmergencyDues), key: 'emergencyDues' },
        { label: 'Collection Rate', value: `${summary.collectionRate.toFixed(1)}%`, key: 'collectionRate' },
        { label: 'Active Members', value: String(summary.activeMembers), key: 'activeMembers' },
        { label: 'Pending Payments', value: String(summary.pendingPayments), key: 'pendingPayments' },
      ]);
    }
  }, [summary]);

  const updateField = (key: string, newValue: string) => {
    setEditableFields(prev => 
      prev.map(field => field.key === key ? { ...field, value: newValue } : field)
    );
  };

  const handlePrint = () => {
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text(reportTitle, 14, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 14, yPos);
    yPos += 15;

    // Financial Summary
    if ((type === 'summary' || type === 'all') && editableFields.length > 0) {
      doc.setFontSize(14);
      doc.text('Financial Summary', 14, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: editableFields.map(field => [field.label, field.value]),
        theme: 'striped',
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Member Balances
    if ((type === 'members' || type === 'all') && memberBalances && memberBalances.length > 0) {
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

    // Payments Ledger
    if ((type === 'payments' || type === 'all') && paymentsLedger && paymentsLedger.length > 0) {
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

    // Loans Ledger
    if ((type === 'loans' || type === 'all') && loansLedger && loansLedger.length > 0) {
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
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Additional Notes
    if (additionalNotes.trim()) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.text('Notes:', 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(additionalNotes, 180);
      doc.text(splitNotes, 14, yPos);
      yPos += splitNotes.length * 5 + 10;
    }

    // Total Amount Collected at the end
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont(undefined as any, 'bold');
    doc.text('TOTAL AMOUNT COLLECTED', 14, yPos);
    yPos += 8;
    doc.setFontSize(16);
    doc.text(formatCurrency(totalAmountCollected), 14, yPos);
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont(undefined as any, 'normal');
    doc.text('(Verified payments only)', 14, yPos);

    // Open print dialog
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    toast.success('Print dialog opened');
    onOpenChange(false);
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'summary': return 'Financial Summary';
      case 'members': return 'Member Balances';
      case 'payments': return 'Payments Ledger';
      case 'loans': return 'Loans Ledger';
      case 'all': return 'All Reports';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Print Preview - {getTypeLabel()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Report Title */}
          <div className="space-y-2">
            <Label>Report Title</Label>
            {isEditMode ? (
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title"
              />
            ) : (
              <p className="text-lg font-semibold">{reportTitle}</p>
            )}
          </div>

          {/* Financial Summary Fields */}
          {(type === 'summary' || type === 'all') && editableFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Financial Summary</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Metric</th>
                      <th className="text-right p-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableFields.map((field) => (
                      <tr key={field.key} className="border-t">
                        <td className="p-2">{field.label}</td>
                        <td className="p-2 text-right">
                          {isEditMode ? (
                            <Input
                              value={field.value}
                              onChange={(e) => updateField(field.key, e.target.value)}
                              className="text-right h-8"
                            />
                          ) : (
                            <span className="font-medium">{field.value}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Member Balances Preview */}
          {(type === 'members' || type === 'all') && memberBalances && memberBalances.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Member Balances ({memberBalances.length} members)
              </h3>
              <p className="text-xs text-muted-foreground">
                Preview: {memberBalances.slice(0, 3).map(b => b.fullName).join(', ')}
                {memberBalances.length > 3 && ` +${memberBalances.length - 3} more`}
              </p>
            </div>
          )}

          {/* Payments Preview */}
          {(type === 'payments' || type === 'all') && paymentsLedger && paymentsLedger.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Payments Ledger ({paymentsLedger.length} records)
              </h3>
            </div>
          )}

          {/* Loans Preview */}
          {(type === 'loans' || type === 'all') && loansLedger && loansLedger.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Loans Ledger ({loansLedger.length} records)
              </h3>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Add any notes or comments to include in the report..."
              rows={3}
            />
          </div>

          {/* Total Amount Collected */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Total Amount Collected (Verified)</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalAmountCollected)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This will appear at the end of the printed report
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
