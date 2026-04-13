import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Plus, Wallet, Fuel, User, ChevronDown, ChevronUp, CreditCard, AlertTriangle, Calendar } from 'lucide-react';
import { RepaymentHistory } from '@/components/loans/RepaymentHistory';
import { format, isPast, differenceInDays } from 'date-fns';

interface Loan {
  id: string;
  type: string;
  amount: number;
  reason: string | null;
  requested_at: string;
  status: string;
  outstanding_balance: number;
  interest_rate_percent: number | null;
  interest_amount: number | null;
  total_repayable: number | null;
  due_date: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
}

interface RepaymentTotal {
  loan_id: string;
  total_repaid: number;
}

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repaymentTotals, setRepaymentTotals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const toggleExpanded = (loanId: string) => {
    setExpandedLoanId(expandedLoanId === loanId ? null : loanId);
  };

  useEffect(() => {
    if (user) fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    if (!user) return;

    const [loansRes, repaymentsRes] = await Promise.all([
      supabase
        .from('loans')
        .select('*')
        .eq('member_user_id', user.id)
        .order('requested_at', { ascending: false }),
      supabase
        .from('loan_repayments')
        .select('loan_id, amount')
        .in('loan_id', (await supabase
          .from('loans')
          .select('id')
          .eq('member_user_id', user.id)
        ).data?.map(l => l.id) || []),
    ]);

    if (loansRes.error) {
      console.error('Error fetching loans:', loansRes.error);
    } else {
      setLoans((loansRes.data as any[]) || []);
    }

    const totals: Record<string, number> = {};
    if (repaymentsRes.data) {
      for (const r of repaymentsRes.data) {
        totals[r.loan_id] = (totals[r.loan_id] || 0) + Number(r.amount);
      }
    }
    setRepaymentTotals(totals);
    setIsLoading(false);
  };

  const getLoanIcon = (type: string) =>
    type === 'petrol' ? <Fuel className="h-5 w-5 text-warning" /> : <User className="h-5 w-5 text-info" />;

  const isOverdue = (loan: Loan) => {
    if (!loan.due_date) return false;
    if (loan.status !== 'approved' && loan.status !== 'disbursed') return false;
    if (Number(loan.outstanding_balance) <= 0) return false;
    return isPast(new Date(loan.due_date));
  };

  const getDisplayStatus = (loan: Loan) => {
    if (loan.status === 'repaid') return 'repaid';
    if (isOverdue(loan)) return 'overdue';
    return loan.status;
  };

  const totalOutstanding = loans
    .filter(l => ['approved', 'disbursed'].includes(l.status))
    .reduce((sum, l) => sum + Number(l.outstanding_balance), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Loans"
        subtitle="Request and manage loans"
        action={
          <Link to="/loans/request">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 rounded-xl h-9">
              <Plus className="h-4 w-4" />
              Request
            </Button>
          </Link>
        }
      />

      {totalOutstanding > 0 && (
        <Card className="mb-4 bg-primary text-primary-foreground animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/10 -translate-y-6 translate-x-6" />
          <CardContent className="p-5 relative">
            <p className="text-primary-foreground/60 text-xs font-medium mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5"><div className="h-24 bg-muted rounded-xl" /></CardContent>
              </Card>
            ))}
          </div>
        ) : loans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="fintech-icon-box bg-muted mx-auto mb-4">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No loan history</h3>
              <p className="text-sm text-muted-foreground mb-4">Need a petrol or personal loan? Request one here.</p>
              <Link to="/loans/request">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl">Request Loan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan, index) => {
            const overdue = isOverdue(loan);
            const isActive = ['approved', 'disbursed'].includes(loan.status);
            const totalRepayable = Number(loan.total_repayable || loan.amount);
            const totalRepaid = repaymentTotals[loan.id] || 0;
            const remainingBalance = Number(loan.outstanding_balance);
            const progress = totalRepayable > 0 ? Math.min(100, (totalRepaid / totalRepayable) * 100) : 0;
            const displayStatus = getDisplayStatus(loan);

            return (
              <Card
                key={loan.id}
                className={`animate-fade-in ${overdue ? 'border-destructive/30' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`fintech-icon-box-sm ${loan.type === 'petrol' ? 'bg-warning/10' : 'bg-info/10'}`}>
                        {getLoanIcon(loan.type)}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{loan.type} Loan</p>
                        <p className="text-xs text-muted-foreground">{formatDate(loan.requested_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 rounded-full">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Overdue
                        </Badge>
                      )}
                      <StatusBadge status={displayStatus} variant="loan" />
                    </div>
                  </div>

                  {/* Overdue warning */}
                  {overdue && loan.due_date && (
                    <div className="bg-destructive/8 border border-destructive/15 rounded-xl p-3 flex items-center gap-2.5 mb-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive font-medium">
                        Overdue by {differenceInDays(new Date(), new Date(loan.due_date))} days. Please settle your balance.
                      </p>
                    </div>
                  )}

                  {/* Financial details grid */}
                  <div className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
                    <span className="text-muted-foreground">Loan Amount</span>
                    <span className="font-medium text-right">{formatCurrency(Number(loan.amount))}</span>

                    {loan.interest_rate_percent != null && loan.interest_rate_percent > 0 && (
                      <>
                        <span className="text-muted-foreground">Interest ({loan.interest_rate_percent}%)</span>
                        <span className="font-medium text-warning text-right">+{formatCurrency(Number(loan.interest_amount || 0))}</span>
                      </>
                    )}

                    <span className="text-muted-foreground">Total Repayable</span>
                    <span className="font-medium text-right">{formatCurrency(totalRepayable)}</span>

                    {(isActive || loan.status === 'repaid') && (
                      <>
                        <span className="text-muted-foreground pt-1.5 border-t border-border/30 col-span-2" />
                        <span className="text-muted-foreground">Total Repaid</span>
                        <span className="font-medium text-success text-right">{formatCurrency(totalRepaid)}</span>

                        <span className="text-muted-foreground">Remaining Balance</span>
                        <span className={`font-bold text-right ${remainingBalance > 0 ? 'text-accent' : 'text-success'}`}>
                          {formatCurrency(remainingBalance)}
                        </span>
                      </>
                    )}

                    {loan.due_date && (isActive || loan.status === 'repaid') && (
                      <>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Repayment Deadline
                        </span>
                        <span className={`font-medium text-right ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                          {format(new Date(loan.due_date), 'dd MMM yyyy')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Repayment progress */}
                  {(isActive || loan.status === 'repaid') && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Repayment Progress</span>
                        <span className="font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2.5" />
                    </div>
                  )}

                  {loan.reason && (
                    <p className="text-xs text-muted-foreground mt-3 italic">"{loan.reason}"</p>
                  )}

                  {/* Submit payment button */}
                  {isActive && remainingBalance > 0 && (
                    <Link to={`/payments/submit?type=loan_repayment&amount=${remainingBalance}&loanType=${loan.type}&interest=${loan.interest_amount || 0}&loanId=${loan.id}`}>
                      <Button className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90 gap-2 rounded-xl h-11" size="sm">
                        <CreditCard className="h-4 w-4" />
                        Submit Payment ({formatCurrency(remainingBalance)})
                      </Button>
                    </Link>
                  )}

                  {/* Repayment history toggle */}
                  {(isActive || loan.status === 'repaid') && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground p-0 h-auto w-full justify-start hover:text-foreground"
                        onClick={() => toggleExpanded(loan.id)}
                      >
                        {expandedLoanId === loan.id ? (
                          <><ChevronUp className="h-4 w-4 mr-1" />Hide Repayment History</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" />View Repayment History</>
                        )}
                      </Button>
                      {expandedLoanId === loan.id && (
                        <div className="mt-2"><RepaymentHistory loanId={loan.id} /></div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
