import { AlertTriangle } from 'lucide-react';

interface Props {
  balance: number;
  threshold: number;
}

export function PersonalFundLowBanner({ balance, threshold }: Props) {
  if (balance >= threshold) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4 animate-fade-in">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <div>
        <p className="text-sm font-semibold text-destructive">Personal Loan Fund Running Low</p>
        <p className="text-xs text-destructive/80">
          Current balance: R{balance.toFixed(2)} — below threshold of R{threshold.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
