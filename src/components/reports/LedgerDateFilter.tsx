import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, format } from 'date-fns';
import type { LedgerTransactionType } from '@/hooks/useFinancialLedger';

interface LedgerDateFilterProps {
  onFilter: (filters: { dateFrom?: string; dateTo?: string; transactionType?: LedgerTransactionType }) => void;
}

export function LedgerDateFilter({ onFilter }: LedgerDateFilterProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transactionType, setTransactionType] = useState<string>('all');

  const applyPreset = (preset: string) => {
    const now = new Date();
    let from: Date, to: Date;
    switch (preset) {
      case 'this-week':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'this-month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'last-month':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'last-3-months':
        from = startOfMonth(subMonths(now, 3));
        to = now;
        break;
      default:
        return;
    }
    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');
    setDateFrom(fromStr);
    setDateTo(toStr);
    onFilter({
      dateFrom: new Date(fromStr).toISOString(),
      dateTo: new Date(toStr + 'T23:59:59').toISOString(),
      transactionType: transactionType !== 'all' ? transactionType as LedgerTransactionType : undefined,
    });
  };

  const handleApply = () => {
    onFilter({
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
      transactionType: transactionType !== 'all' ? transactionType as LedgerTransactionType : undefined,
    });
  };

  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
    setTransactionType('all');
    onFilter({});
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filters
        </div>

        <div className="flex flex-wrap gap-2">
          {['this-week', 'this-month', 'last-month', 'last-3-months'].map(p => (
            <Button key={p} variant="outline" size="sm" onClick={() => applyPreset(p)} className="text-xs">
              {p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Transaction Type</Label>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="weekly_contribution">Weekly Contribution</SelectItem>
              <SelectItem value="joining_fee_payment">Joining Fee</SelectItem>
              <SelectItem value="petrol_loan_issued">Petrol Loan Issued</SelectItem>
              <SelectItem value="petrol_loan_repayment">Petrol Loan Repayment</SelectItem>
              <SelectItem value="personal_loan_issued">Personal Loan Issued</SelectItem>
              <SelectItem value="personal_loan_repayment">Personal Loan Repayment</SelectItem>
              <SelectItem value="funeral_contribution">Funeral Contribution</SelectItem>
              <SelectItem value="accident_contribution">Accident Contribution</SelectItem>
              <SelectItem value="emergency_contribution">Emergency Contribution</SelectItem>
              <SelectItem value="late_fee">Late Fee</SelectItem>
              <SelectItem value="cash_fee">Cash/ATM Fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleApply} className="flex-1">Apply</Button>
          <Button size="sm" variant="outline" onClick={handleClear}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}
