import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency, getJoiningFeeTotal, getWeeklySubscription, getPetrolLoanMax, getPersonalLoanMax } from '@/lib/constants';
import { Users, Phone, Car, Search, Shield, ShieldCheck, Eye, Loader2, X, CheckSquare, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  joining_fee_paid_total: number;
  membership_slots: number;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingRoleId, setProcessingRoleId] = useState<string | null>(null);
  const [processingSlotsId, setProcessingSlotsId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Bulk selection state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [bulkSlotsValue, setBulkSlotsValue] = useState<string>('');
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete member state
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [members, searchQuery, statusFilter]);

  // Calculate paginated members
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const updateMemberSlots = async (member: Member, newSlots: number) => {
    if (!user) return;
    setProcessingSlotsId(member.id);

    try {
      const oldSlots = member.membership_slots;

      // Update member profile
      const { error } = await supabase
        .from('member_profiles')
        .update({ membership_slots: newSlots })
        .eq('id', member.id);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'MEMBERSHIP_SLOTS_CHANGED',
        entity_type: 'member_profile',
        entity_id: member.id,
        metadata_json: { old_slots: oldSlots, new_slots: newSlots },
      });

      toast({
        title: 'Slots updated',
        description: `${member.full_name} now has ${newSlots} slot${newSlots > 1 ? 's' : ''}`,
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error updating slots',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingSlotsId(null);
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

  // Bulk selection handlers
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.size === filteredMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedMemberIds(new Set());
    setBulkSlotsValue('');
    setBulkStatusValue('');
  };

  const deleteMember = async () => {
    if (!user || !memberToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Delete member profile (this will cascade to related records if needed)
      const { error: profileError } = await supabase
        .from('member_profiles')
        .delete()
        .eq('id', memberToDelete.id);
      
      if (profileError) throw profileError;
      
      // Delete user role entry
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberToDelete.user_id);
      
      // Log to audit
      await supabase.from('audit_log').insert({
        actor_user_id: user.id,
        action: 'MEMBER_DELETED',
        entity_type: 'member_profile',
        entity_id: memberToDelete.id,
        metadata_json: { deleted_member_name: memberToDelete.full_name, deleted_user_id: memberToDelete.user_id },
      });
      
      toast({
        title: 'Member deleted',
        description: `${memberToDelete.full_name} has been removed from the system`,
      });
      
      setMemberToDelete(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error deleting member',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkSlotsUpdate = async () => {
    if (!user || !bulkSlotsValue || selectedMemberIds.size === 0) return;
    
    const newSlots = parseInt(bulkSlotsValue);
    if (isNaN(newSlots) || newSlots < 1 || newSlots > 5) return;

    setIsBulkUpdating(true);

    try {
      const selectedMembers = members.filter(m => selectedMemberIds.has(m.id));
      
      // Update each member and log to audit
      for (const member of selectedMembers) {
        if (member.membership_slots === newSlots) continue; // Skip if no change

        const oldSlots = member.membership_slots;

        // Update member profile
        const { error } = await supabase
          .from('member_profiles')
          .update({ membership_slots: newSlots })
          .eq('id', member.id);

        if (error) throw error;

        // Log to audit
        await supabase.from('audit_log').insert({
          actor_user_id: user.id,
          action: 'MEMBERSHIP_SLOTS_CHANGED',
          entity_type: 'member_profile',
          entity_id: member.id,
          metadata_json: { old_slots: oldSlots, new_slots: newSlots, bulk_update: true },
        });
      }

      toast({
        title: 'Bulk update complete',
        description: `Updated ${selectedMembers.length} member(s) to ${newSlots} slot${newSlots > 1 ? 's' : ''}`,
      });

      clearSelection();
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Bulk update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!user || !bulkStatusValue || selectedMemberIds.size === 0) return;
    
    const newStatus = bulkStatusValue as 'pending' | 'active' | 'suspended' | 'exited';

    setIsBulkUpdating(true);

    try {
      const selectedMembers = members.filter(m => selectedMemberIds.has(m.id));
      
      for (const member of selectedMembers) {
        if (member.status === newStatus) continue; // Skip if no change

        const oldStatus = member.status;

        // Update member profile
        const { error } = await supabase
          .from('member_profiles')
          .update({ status: newStatus })
          .eq('id', member.id);

        if (error) throw error;

        // Log to audit
        await supabase.from('audit_log').insert({
          actor_user_id: user.id,
          action: 'MEMBER_STATUS_CHANGED',
          entity_type: 'member_profile',
          entity_id: member.id,
          metadata_json: { old_status: oldStatus, new_status: newStatus, bulk_update: true },
        });
      }

      toast({
        title: 'Bulk update complete',
        description: `Updated ${selectedMembers.length} member(s) to ${newStatus}`,
      });

      clearSelection();
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Bulk update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
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

  const exportMembersToCSV = () => {
    const headers = [
      'Full Name',
      'Phone',
      'Vehicle Reg',
      'Uber Driver ID',
      'Status',
      'Membership Slots',
      'Joining Fee Paid',
      'Joining Fee Paid Total',
      'Joining Fee Required',
      'Weekly Subscription',
      'Petrol Loan Max',
      'Personal Loan Max',
      'Join Date',
      'Is Admin'
    ];

    const rows = members.map(member => [
      member.full_name,
      member.phone || '',
      member.vehicle_reg || '',
      member.uber_driver_id || '',
      member.status,
      member.membership_slots,
      member.joining_fee_paid ? 'Yes' : 'No',
      member.joining_fee_paid_total || 0,
      getJoiningFeeTotal(member.membership_slots),
      getWeeklySubscription(member.membership_slots),
      getPetrolLoanMax(member.membership_slots),
      getPersonalLoanMax(member.membership_slots),
      formatDate(member.join_date),
      member.isAdmin ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `members-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Exported ${members.length} members to CSV`,
    });
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Members" subtitle="Manage stokvel members" showBack />

      {/* Bulk Selection Toolbar */}
      {selectedMemberIds.size > 0 && (
        <Card className="mb-4 border-accent bg-accent/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{selectedMemberIds.size} selected</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearSelection}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={bulkSlotsValue} onValueChange={setBulkSlotsValue}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue placeholder="Set slots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 slot</SelectItem>
                    <SelectItem value="2">2 slots</SelectItem>
                    <SelectItem value="3">3 slots</SelectItem>
                    <SelectItem value="4">4 slots</SelectItem>
                    <SelectItem value="5">5 slots</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleBulkSlotsUpdate}
                  disabled={!bulkSlotsValue || isBulkUpdating}
                >
                  {isBulkUpdating && bulkSlotsValue ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Users className="h-3 w-3 mr-1" />
                  )}
                  Update Slots
                </Button>
                
                <div className="w-px h-6 bg-border mx-1" />
                
                <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="exited">Exited</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleBulkStatusUpdate}
                  disabled={!bulkStatusValue || isBulkUpdating}
                >
                  {isBulkUpdating && bulkStatusValue ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Users className="h-3 w-3 mr-1" />
                  )}
                  Update Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
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
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs whitespace-nowrap"
              onClick={toggleSelectAll}
            >
              {selectedMemberIds.size === filteredMembers.length && filteredMembers.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs whitespace-nowrap"
              onClick={exportMembersToCSV}
              disabled={members.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
          </div>
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
          paginatedMembers.map((member, index) => (
            <Card 
              key={member.id}
              className={`animate-fade-in transition-colors ${selectedMemberIds.has(member.id) ? 'ring-2 ring-accent bg-accent/5' : ''}`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedMemberIds.has(member.id)}
                      onCheckedChange={() => toggleMemberSelection(member.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{member.full_name}</p>
                        {member.isAdmin && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-0">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {member.membership_slots > 1 && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {member.membership_slots} slots
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

                {/* Joining Fee Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Joining Fee</span>
                    <span className="font-medium">
                      {formatCurrency(member.joining_fee_paid_total || 0)} / {formatCurrency(getJoiningFeeTotal(member.membership_slots))}
                    </span>
                  </div>
                  <Progress 
                    value={((member.joining_fee_paid_total || 0) / getJoiningFeeTotal(member.membership_slots)) * 100} 
                    className="h-1.5" 
                  />
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

                  {/* Membership Slots Selector */}
                  <Select 
                    value={String(member.membership_slots)} 
                    onValueChange={(v) => updateMemberSlots(member, parseInt(v))}
                    disabled={processingSlotsId === member.id}
                  >
                    <SelectTrigger className="h-8 text-xs w-[90px]">
                      {processingSlotsId === member.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 slot</SelectItem>
                      <SelectItem value="2">2 slots</SelectItem>
                      <SelectItem value="3">3 slots</SelectItem>
                      <SelectItem value="4">4 slots</SelectItem>
                      <SelectItem value="5">5 slots</SelectItem>
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
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
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

                          {/* Slot-based limits preview */}
                          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Slot-Based Limits ({member.membership_slots} slots)
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Weekly due:</span>
                                <span className="ml-1 font-medium">{formatCurrency(getWeeklySubscription(member.membership_slots))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Joining fee:</span>
                                <span className="ml-1 font-medium">{formatCurrency(getJoiningFeeTotal(member.membership_slots))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Petrol max:</span>
                                <span className="ml-1 font-medium">{formatCurrency(getPetrolLoanMax(member.membership_slots))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Personal max:</span>
                                <span className="ml-1 font-medium">{formatCurrency(getPersonalLoanMax(member.membership_slots))}</span>
                              </div>
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
                              <span className="text-muted-foreground">Membership Slots</span>
                              <span>{member.membership_slots}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="text-muted-foreground">Joining Fee Paid</span>
                              <span>
                                {formatCurrency(member.joining_fee_paid_total || 0)} / {formatCurrency(getJoiningFeeTotal(member.membership_slots))}
                              </span>
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setMemberToDelete(member)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground mt-4">
        Showing {paginatedMembers.length} of {filteredMembers.length} members
        {filteredMembers.length !== members.length && ` (${members.length} total)`}
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{memberToDelete?.full_name}</strong>? 
              This action cannot be undone and will remove their profile and role from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMember}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}