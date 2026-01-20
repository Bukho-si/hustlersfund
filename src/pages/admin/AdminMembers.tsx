import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/constants';
import { Users, Phone, Car, Search } from 'lucide-react';
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
}

export default function AdminMembers() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, statusFilter]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .order('join_date', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error loading members',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMembers(data || []);
    }
    setIsLoading(false);
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
                  <div>
                    <p className="font-semibold">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(member.join_date)}
                    </p>
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

                <div className="flex items-center gap-2">
                  <Select 
                    value={member.status} 
                    onValueChange={(v: 'pending' | 'active' | 'suspended' | 'exited') => updateMemberStatus(member.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="exited">Exited</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    {member.joining_fee_paid ? '✓ Joining fee paid' : '○ Fee pending'}
                  </div>
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
