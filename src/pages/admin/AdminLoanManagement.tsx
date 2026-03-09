import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, getLoanStatusColor } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdmin } from '@/lib/roles';
import { toast } from 'sonner';
import {
  FileText, CheckCircle, XCircle, Wallet, TrendingUp,
  AlertTriangle, Clock, Filter, Search
} from 'lucide-react';
import { LoanExportButton } from '@/components/loans/LoanExportButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LoanRow {
  id: string;
  member_user_id: string;
  type: string;
  amount: number;
  requested_at: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  interest_amount: number | null;
  total_repayable: number | null;
  outstanding_balance: number;
  due_date: string | null;
  reason: string | null;
  rejection_reason: string | null;
  interest_rate_percent: number | null;
}

interface RepaymentRow {
  id: string;
  loan_id: string;
  amount: number;
  paid_at: string;
  recorded_by: string;
}

interface WalletTxnRow {
  id: string;
  member_user_id: string;
  transaction_type: string;
  amount: number;
  reference_id: string | null;
  created_at: string;
}

interface ProfileMap {
  [userId: string]: string;
}

export default function AdminLoanManagement() {
  const { userRoles } = useAuth();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [repayments, setRepayments] = useState<RepaymentRow[]>([]);
  const [walletTxns, setWalletTxns] = useState<WalletTxnRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [loansRes, repaymentsRes, txnsRes, profilesRes] = await Promise.all([
        supabase.from('loans').select('*').order('requested_at', { ascending: false }),
        supabase.from('loan_repayments').select('*').order('paid_at', { ascending: false }),
        supabase.from('wallet_transactions').select('*')
          .in('transaction_type', ['petrol_loan_issued', 'petrol_loan_repayment', 'personal_loan_issued', 'personal_loan_repayment'])
          .order('created_at', { ascending: false }),
        supabase.from('member_profiles').select('user_id, full_name'),
      ]);

      const pMap: ProfileMap = {};
      profilesRes.data?.forEach(p => { pMap[p.user_id] = p.full_name; });

      setLoans(loansRes.data || []);
      setRepayments(repaymentsRes.data || []);
      setWalletTxns(txnsRes.data || []);
      setProfiles(pMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getName = (userId: string) => profiles[userId] || 'Unknown';

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (memberSearch) {
        const name = getName(l.member_user_id).toLowerCase();
        if (!name.includes(memberSearch.toLowerCase())) return false;
      }
      if (dateFrom && new Date(l.requested_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (new Date(l.requested_at) > end) return false;
      }
      return true;
    });
  }, [loans, typeFilter, statusFilter, memberSearch, dateFrom, dateTo, profiles]);

  // Applications = pending/requested/under_review
  const applications = filteredLoans.filter(l => ['pending', 'requested', 'under_review'].includes(l.status));
  const activeLoans = filteredLoans.filter(l => ['approved', 'disbursed'].includes(l.status));

  // Filtered repayments
  const filteredRepayments = useMemo(() => {
    return repayments.filter(r => {
      const loan = loans.find(l => l.id === r.loan_id);
      if (!loan) return true;
      if (typeFilter !== 'all' && loan.type !== typeFilter) return false;
      if (memberSearch) {
        const name = getName(loan.member_user_id).toLowerCase();
        if (!name.includes(memberSearch.toLowerCase())) return false;
      }
      if (dateFrom && new Date(r.paid_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (new Date(r.paid_at) > end) return false;
      }
      return true;
    });
  }, [repayments, loans, typeFilter, memberSearch, dateFrom, dateTo, profiles]);

  // Filtered wallet txns
  const filteredTxns = useMemo(() => {
    return walletTxns.filter(t => {
      if (typeFilter !== 'all') {
        const isPetrol = t.transaction_type.startsWith('petrol');
        if (typeFilter === 'petrol' && !isPetrol) return false;
        if (typeFilter === 'personal' && isPetrol) return false;
      }
      if (memberSearch) {
        const name = getName(t.member_user_id).toLowerCase();
        if (!name.includes(memberSearch.toLowerCase())) return false;
      }
      if (dateFrom && new Date(t.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (new Date(t.created_at) > end) return false;
      }
      return true;
    });
  }, [walletTxns, typeFilter, memberSearch, dateFrom, dateTo, profiles]);

  // Metrics
  const totalApplications = loans.filter(l => ['pending', 'requested', 'under_review'].includes(l.status)).length;
  const totalActive = loans.filter(l => ['approved', 'disbursed'].includes(l.status)).length;
  const totalOutstanding = loans.filter(l => ['approved', 'disbursed'].includes(l.status)).reduce((s, l) => s + l.outstanding_balance, 0);
  const totalRepaid = repayments.reduce((s, r) => s + r.amount, 0);
  const overdueLoans = loans.filter(l => ['approved', 'disbursed'].includes(l.status) && l.due_date && new Date(l.due_date) < new Date()).length;

  // Actions
  const handleApprove = async (loan: LoanRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: any = {
      status: loan.type === 'petrol' ? 'approved' : 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('loans').update(updates).eq('id', loan.id);
    if (error) {
      toast.error('Failed to approve loan');
    } else {
      toast.success('Loan approved');
      fetchAll();
    }
  };

  const handleReject = async (loan: LoanRow) => {
    const { error } = await supabase.from('loans').update({
      status: 'rejected',
      rejection_reason: 'Rejected by Super Admin',
    }).eq('id', loan.id);
    if (error) {
      toast.error('Failed to reject loan');
    } else {
      toast.success('Loan rejected');
      fetchAll();
    }
  };

  if (!isSuperAdmin(userRoles)) {
    return (
      <AppLayout requireAdmin>
        <div className="p-8 text-center text-muted-foreground">Access restricted to Super Admins.</div>
      </AppLayout>
    );
  }

  const metrics = [
    { label: 'Applications', value: totalApplications, icon: FileText, color: 'text-warning' },
    { label: 'Active Loans', value: totalActive, icon: CheckCircle, color: 'text-success' },
    { label: 'Outstanding', value: formatCurrency(totalOutstanding), icon: Wallet, color: 'text-info' },
    { label: 'Total Repaid', value: formatCurrency(totalRepaid), icon: TrendingUp, color: 'text-success' },
    { label: 'Overdue', value: overdueLoans, icon: AlertTriangle, color: 'text-destructive' },
  ];

  const formatTxnType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Loan Management" subtitle="Centralized loan overview for all loan types" />

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-3 text-center">
              <m.icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Loan Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="repaid">Repaid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-9 text-xs pl-7" placeholder="Search member..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs flex-1">
                    {dateFrom ? format(dateFrom, 'dd MMM') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs flex-1">
                    {dateTo ? format(dateTo, 'dd MMM') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="applications" className="text-xs py-2">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs py-2">Active ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="repayments" className="text-xs py-2">Repayments ({filteredRepayments.length})</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs py-2">Ledger ({filteredTxns.length})</TabsTrigger>
        </TabsList>

        {/* Applications */}
        <TabsContent value="applications">
          <Card>
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No pending applications</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Member</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell className="text-xs font-medium">{getName(loan.member_user_id)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{loan.type}</Badge></TableCell>
                          <TableCell className="text-xs">{formatCurrency(loan.amount)}</TableCell>
                          <TableCell className="text-xs">{formatDate(loan.requested_at)}</TableCell>
                          <TableCell><Badge className={`text-xs ${getLoanStatusColor(loan.status)}`}>{loan.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleApprove(loan)}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => handleReject(loan)}>
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Loans */}
        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {activeLoans.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No active loans</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Member</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Principal</TableHead>
                        <TableHead className="text-xs">Interest</TableHead>
                        <TableHead className="text-xs">Total Repayable</TableHead>
                        <TableHead className="text-xs">Outstanding</TableHead>
                        <TableHead className="text-xs">Deadline</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeLoans.map(loan => (
                        <TableRow key={loan.id} className={loan.due_date && new Date(loan.due_date) < new Date() ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-xs font-medium">{getName(loan.member_user_id)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{loan.type}</Badge></TableCell>
                          <TableCell className="text-xs">{formatCurrency(loan.amount)}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(loan.interest_amount || 0)}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(loan.total_repayable || 0)}</TableCell>
                          <TableCell className="text-xs font-semibold">{formatCurrency(loan.outstanding_balance)}</TableCell>
                          <TableCell className="text-xs">
                            {loan.due_date ? (
                              <span className={new Date(loan.due_date) < new Date() ? 'text-destructive font-medium' : ''}>
                                {formatDate(loan.due_date)}
                                {new Date(loan.due_date) < new Date() && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell><Badge className={`text-xs ${getLoanStatusColor(loan.status)}`}>{loan.status}</Badge></TableCell>
                          <TableCell className="text-xs">{loan.approved_by ? getName(loan.approved_by) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repayments */}
        <TabsContent value="repayments">
          <Card>
            <CardContent className="p-0">
              {filteredRepayments.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No repayments found</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Member</TableHead>
                        <TableHead className="text-xs">Loan Type</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Payment Date</TableHead>
                        <TableHead className="text-xs">Recorded By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRepayments.map(r => {
                        const loan = loans.find(l => l.id === r.loan_id);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-medium">{loan ? getName(loan.member_user_id) : '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs capitalize">{loan?.type || '—'}</Badge></TableCell>
                            <TableCell className="text-xs">{formatCurrency(r.amount)}</TableCell>
                            <TableCell className="text-xs">{formatDate(r.paid_at)}</TableCell>
                            <TableCell className="text-xs">{getName(r.recorded_by)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger */}
        <TabsContent value="ledger">
          <Card>
            <CardContent className="p-0">
              {filteredTxns.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No loan transactions found</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Member</TableHead>
                        <TableHead className="text-xs">Transaction Type</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Ref Loan ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTxns.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
                          <TableCell className="text-xs font-medium">{getName(t.member_user_id)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{formatTxnType(t.transaction_type)}</Badge></TableCell>
                          <TableCell className="text-xs">{formatCurrency(t.amount)}</TableCell>
                          <TableCell className="text-xs font-mono">{t.reference_id ? t.reference_id.slice(0, 8) + '…' : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
