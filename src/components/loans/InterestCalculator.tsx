import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';
import { Percent, Calculator, Wallet } from 'lucide-react';

interface InterestCalculatorProps {
  amount: number;
  interestRatePercent: number;
  loanType: 'petrol' | 'personal';
}

export function InterestCalculator({ 
  amount, 
  interestRatePercent, 
  loanType 
}: InterestCalculatorProps) {
  const interestAmount = amount * (interestRatePercent / 100);
  const totalRepayable = amount + interestAmount;
  const repaymentPeriod = loanType === 'petrol' ? 'Weekly' : 'Monthly';

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-4 w-4 text-accent" />
          <h4 className="font-medium text-sm">Interest Preview</h4>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Loan Amount</span>
            <span className="font-medium">{formatCurrency(amount)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Interest Rate
            </span>
            <span className="font-medium">{interestRatePercent}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Interest Amount</span>
            <span className="font-medium text-warning">{formatCurrency(interestAmount)}</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Total Repayable
              </span>
              <span className="font-semibold text-accent">{formatCurrency(totalRepayable)}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            Simple interest • {repaymentPeriod} repayment period
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
