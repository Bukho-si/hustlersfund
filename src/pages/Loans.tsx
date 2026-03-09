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
import { Plus, Wallet, Fuel, User, ChevronDown, ChevronUp, CreditCard, AlertTriangle, Clock, Calendar } from 'lucide-react';
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
  repayment_period: string | null;
  due_date: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
}

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
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
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('member_user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching loans:', error);
    } else {
      setLoans((data as any[]) || []);
    }
    setIsLoading(false);
  };

  const getLoanIcon = (type: string) => {
    return type === 'petrol' ? (
      <Fuel className="h-5 w-5 text-warning" />
    ) : (
      <User className="h-5 w-5 text-info" />
    );
  };

  const isOverdue = (loan: Loan) => {
    if (!loan.due_date) return false;
    if (loan.status !== 'approved' && loan.status !== 'disbursed') return false;
    if (Number(loan.outstanding_balance) <= 0) return false;
    return isPast(new Date(loan.due_date));
  };

  const getRepaymentProgress = (loan: Loan) => {
    const total = Number(loan.total_repayable || loan.amount);
    const outstanding = Number(loan.outstanding_balance);
    if (total <= 0) return 100;
    const paid = total - outstanding;
    return Math.min(100, Math.max(0, (paid / total) * 100));
  };

  const totalOutstanding = loans
    .filter(l => l.status === 'approved' || l.status === 'disbursed')
    .reduce((sum, l) => sum + Number(l.outstanding_balance), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Loans"
        subtitle="Request and manage loans"
        action={
          <Link to="/loans/request">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1">
              <Plus className="h-4 w-4" />
              Request
            </Button>
          </Link>
        }
      />

      {totalOutstanding > 0 && (
        <Card className="mb-4 bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-primary-foreground/70 text-xs mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : loans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No loan history</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Need a petrol or personal loan? Request one here.
              </p>
              <Link to="/loans/request">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Request Loan
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan, index) => {
            const overdue = isOverdue(loan);
            const progress = getRepaymentProgress(loan);
            const isActive = loan.status === 'approved' || loan.status === 'disbursed';

            return (
              <Card
                key={loan.id}
                className={`animate-fade-in ${overdue ? 'border-destructive/50' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getLoanIcon(loan.type)}
                      <div>
                        <p className="font-medium capitalize">{loan.type} Loan</p>
                        <p className="text-xs text-muted-foreground">{formatDate(loan.requested_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Overdue
                        </Badge>
                      )}
                      <StatusBadge status={loan.status} variant="loan" />
                    </div>
                  </div>

                  {/* Overdue warning */}
                  {overdue && (
                    <div className="bg-destructive/10 rounded-lg p-2.5 flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive font-medium">
                        This loan is overdue by {differenceInDays(new Date(), new Date(loan.due_date!))} days. Please settle your balance.
                      </p>
                    </div>
                  )}

                  {/* Financial details */}
                  <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                    <span className="text-muted-foreground">Loan Amount</span>
                    <span className="font-medium text-right">{formatCurrency(Number(loan.amount))}</span>

                    {loan.interest_rate_percent !== null && loan.interest_rate_percent > 0 && (
                      <>
                        <span className="text-muted-foreground">Interest ({loan.interest_rate_percent}%)</span>
                        <span className="font-medium text-warning text-right">+{formatCurrency(Number(loan.interest_amount || 0))}</span>
                        <span className="text-muted-foreground">Total Repayable</span>
                        <span className="font-medium text-right">{formatCurrency(Number(loan.total_repayable || loan.amount))}</span>
                      </>
                    )}

                    {isActive && (
                      <>
                        <span className="text-muted-foreground pt-1 border-t col-span-2" />
                        <span className="text-muted-foreground">Outstanding Balance</span>
                        <span className="font-semibold text-accent text-right">{formatCurrency(Number(loan.outstanding_balance))}</span>
                      </>
                    )}

                    {/* Repayment deadline */}
                    {loan.due_date && isActive && (
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
                  {isActive && Number(loan.outstanding_balance) > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Repayment Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {loan.reason && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{loan.reason}"</p>
                  )}

                  {isActive && Number(loan.outstanding_balance) > 0 && (
                    <Link to={`/payments/submit?type=loan_repayment&amount=${loan.outstanding_balance}&loanType=${loan.type}&interest=${loan.interest_amount || 0}&loanId=${loan.id}`}>
                      <Button className="w-full mt-3 bg-accent text-accent-foreground hover:bg-accent/90 gap-2" size="sm">
                        <CreditCard className="h-4 w-4" />
                        Submit Payment ({formatCurrency(Number(loan.outstanding_balance))})
                      </Button>
                    </Link>
                  )}

                  {isActive && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground p-0 h-auto w-full justify-start"
                        onClick={() => toggleExpanded(loan.id)}
                      >
                        {expandedLoanId === loan.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide Repayment History
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            View Repayment History
                          </>
                        )}
                      </Button>
                      {expandedLoanId === loan.id && (
                        <div className="mt-2">
                          <RepaymentHistory loanId={loan.id} />
                        </div>
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
