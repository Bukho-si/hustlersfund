import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Plus, Wallet, Fuel, User, ChevronDown, ChevronUp } from 'lucide-react';
import { RepaymentHistory } from '@/components/loans/RepaymentHistory';

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
    if (user) {
      fetchLoans();
    }
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
      setLoans(data || []);
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

  const totalOutstanding = loans
    .filter(l => l.status === 'approved')
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

      {/* Outstanding Balance Card */}
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
          loans.map((loan, index) => (
            <Card 
              key={loan.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getLoanIcon(loan.type)}
                    <div>
                      <p className="font-medium capitalize">
                        {loan.type} Loan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(loan.requested_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={loan.status} variant="loan" />
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal amount</span>
                    <span className="font-medium">{formatCurrency(Number(loan.amount))}</span>
                  </div>
                  {loan.interest_rate_percent !== null && loan.interest_rate_percent > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest ({loan.interest_rate_percent}%)</span>
                        <span className="font-medium text-warning">+{formatCurrency(Number(loan.interest_amount || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total repayable</span>
                        <span className="font-medium">{formatCurrency(Number(loan.total_repayable || loan.amount))}</span>
                      </div>
                    </>
                  )}
                  {loan.status === 'approved' && (
                    <div className="flex justify-between pt-1 border-t mt-1">
                      <span className="text-muted-foreground">Outstanding balance</span>
                      <span className="font-semibold text-accent">{formatCurrency(Number(loan.outstanding_balance))}</span>
                    </div>
                  )}
                </div>

                {loan.reason && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    "{loan.reason}"
                  </p>
                )}

                {loan.status === 'approved' && (
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
          ))
        )}
      </div>
    </AppLayout>
  );
}
