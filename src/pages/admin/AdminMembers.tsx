import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/constants';
import { Users, Phone, Car, Search, Shield, ShieldCheck, Eye, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  vehicle_reg: string | null;
  uber_driver_id: string | null;
  status: string;
  joining_fee_paid: boolean;
  join_date: string;
  isAdmin?: boolean;
}

interface MemberDetails {
  totalPayments: number;
  pendingPayments: number;
  activeLoans: number;
  outstandingLoanBalance: number;
}

export default function AdminMembers() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingRoleId, setProcessingRoleId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, statusFilter]);

  const fetchMembers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('member_profiles')
      .select('*')
      .order('join_date', { ascending: false });

    if (profilesError) {
      console.error('Error fetching members:', profilesError);
      toast({
        title: 'Error loading members',
        description: profilesError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Fetch admin roles
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
    
    const membersWithRoles = (profilesData || []).map(member => ({
      ...member,
      isAdmin: adminUserIds.has(member.user_id),
    }));

    setMembers(membersWithRoles);
    setIsLoading(false);
  };

  const fetchMemberDetails = async (member: Member) => {
    setLoadingDetails(true);
    setSelectedMember(member);
    setMemberDetails(null);

    try {
      const [paymentsRes, loansRes] = await Promise.all([
        supabase
          .from('payments')
          .select('status, total_amount')
          .eq('member_user_id', member.user_id),
        supabase
          .from('loans')
          .select('status, outstanding_balance')
          .eq('member_user_id', member.user_id),
      ]);

      const payments = paymentsRes.data || [];
      const loans = loansRes.data || [];

      setMemberDetails({
        totalPayments: payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + Number(p.total_amount), 0),
        pendingPayments: payments.filter(p => ['submitted', 'pending_verification'].includes(p.status)).length,
        activeLoans: loans.filter(l => l.status === 'approved' && Number(l.outstanding_balance) > 0).length,
        outstandingLoanBalance: loans.filter(l => l.status === 'approved').reduce((sum, l) => sum + Number(l.outstanding_balance), 0),
      });
    } catch (error) {
      console.error('Error fetching member details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleAdminRole = async (member: Member) => {
    setProcessingRoleId(member.user_id);

    try {
      if (member.isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: 'Admin role removed',
          description: `${member.full_name} is no longer an admin`,
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: member.user_id, role: 'admin' });

        if (error) throw error;

        toast({
          title: 'Admin role granted',
          description: `${member.full_name} is now an admin`,
        });
      }

      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingRoleId(null);
    }
  };

  const filterMembers = () => {
    let filtered = members;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.full_name.toLowerCase().includes(query) ||
        m.phone?.toLowerCase().includes(query) ||
        m.vehicle_reg?.toLowerCase().includes(query)
      );
    }
    
    setFilteredMembers(filtered);
  };

  const updateMemberStatus = async (memberId: string, newStatus: 'pending' | 'active' | 'suspended' | 'exited') => {
    const { error } = await supabase
      .from('member_profiles')
      .update({ status: newStatus })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status updated',
        description: `Member status changed to ${newStatus}`,
      });
      fetchMembers();
    }
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Members" subtitle="Manage stokvel members" showBack />

      {/* Search and Filter */}
      <Card className="mb-4">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="exited">Exited</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Members List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No members found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'No members have registered yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member, index) => (
            <Card 
              key={member.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.full_name}</p>
                        {member.isAdmin && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(member.join_date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={member.status} variant="member" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.vehicle_reg && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Car className="h-3 w-3" />
                      <span>{member.vehicle_reg}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select 
                    value={member.status} 
                    onValueChange={(v: 'pending' | 'active' | 'suspended' | 'exited') => updateMemberStatus(member.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="exited">Exited</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-xs ${member.isAdmin ? 'border-accent/50 text-accent' : ''}`}
                    onClick={() => toggleAdminRole(member)}
                    disabled={processingRoleId === member.user_id}
                  >
                    {processingRoleId === member.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : member.isAdmin ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-3 w-3 mr-1" />
                        Make Admin
                      </>
                    )}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => fetchMemberDetails(member)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{selectedMember?.full_name}</DialogTitle>
                      </DialogHeader>
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : memberDetails && selectedMember?.user_id === member.user_id ? (
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-xs text-muted-foreground">Total Verified Payments</p>
                              <p className="text-lg font-semibold">{formatCurrency(memberDetails.totalPayments)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-xs text-muted-foreground">Pending Payments</p>
                              <p className="text-lg font-semibold">{memberDetails.pendingPayments}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-xs text-muted-foreground">Active Loans</p>
                              <p className="text-lg font-semibold">{memberDetails.activeLoans}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                              <p className="text-lg font-semibold text-accent">{formatCurrency(memberDetails.outstandingLoanBalance)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Phone</span>
                              <span>{member.phone || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Vehicle Reg</span>
                              <span>{member.vehicle_reg || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Uber Driver ID</span>
                              <span>{member.uber_driver_id || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Joining Fee</span>
                              <span>{member.joining_fee_paid ? '✓ Paid' : '○ Pending'}</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="text-muted-foreground">Status</span>
                              <StatusBadge status={member.status} variant="member" />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  {member.joining_fee_paid ? '✓ Joining fee paid' : '○ Fee pending'}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        {filteredMembers.length} of {members.length} members
      </p>
    </AppLayout>
  );
}
