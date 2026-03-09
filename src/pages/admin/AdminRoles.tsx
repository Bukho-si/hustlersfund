import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getRoleLabel, AppRole } from '@/lib/roles';
import { UserCog, Shield, ShieldCheck, Loader2, Plus, Trash2 } from 'lucide-react';
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

interface MemberWithRoles {
  user_id: string;
  full_name: string;
  status: string;
  roles: AppRole[];
}

const ASSIGNABLE_ROLES: AppRole[] = ['super_admin', 'accident_admin', 'funeral_admin', 'petrol_loan_admin', 'personal_loan_admin'];

export default function AdminRoles() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; role: AppRole; name: string } | null>(null);

  useEffect(() => { fetchMembersWithRoles(); }, []);

  const fetchMembersWithRoles = async () => {
    const { data: profiles } = await supabase
      .from('member_profiles')
      .select('user_id, full_name, status')
      .order('full_name');

    const { data: allRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map<string, AppRole[]>();
    (allRoles || []).forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role as AppRole);
      roleMap.set(r.user_id, existing);
    });

    const membersWithRoles = (profiles || []).map(p => ({
      ...p,
      roles: roleMap.get(p.user_id) || [],
    }));

    setMembers(membersWithRoles);
    setIsLoading(false);
  };

  const assignRole = async () => {
    if (!user || !selectedUserId || !selectedRole) return;
    setProcessingId(selectedUserId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUserId, role: selectedRole as AppRole });

      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'role_assigned',
        entity_type: 'user_roles',
        entity_id: selectedUserId,
        actor_user_id: user.id,
        metadata_json: { role: selectedRole, target_user_id: selectedUserId },
      });

      toast({ title: 'Role assigned', description: `${getRoleLabel(selectedRole as AppRole)} role assigned successfully` });
      setSelectedUserId('');
      setSelectedRole('');
      fetchMembersWithRoles();
    } catch (error: any) {
      toast({ title: 'Failed to assign role', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const removeRole = async () => {
    if (!user || !removeTarget) return;
    setProcessingId(removeTarget.userId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', removeTarget.userId)
        .eq('role', removeTarget.role);

      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'role_removed',
        entity_type: 'user_roles',
        entity_id: removeTarget.userId,
        actor_user_id: user.id,
        metadata_json: { role: removeTarget.role, target_user_id: removeTarget.userId },
      });

      toast({ title: 'Role removed', description: `${getRoleLabel(removeTarget.role)} role removed from ${removeTarget.name}` });
      setRemoveTarget(null);
      fetchMembersWithRoles();
    } catch (error: any) {
      toast({ title: 'Failed to remove role', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const adminMembers = members.filter(m => m.roles.some(r => r !== 'member'));
  const nonAdminMembers = members.filter(m => m.roles.every(r => r === 'member'));

  return (
    <AppLayout requireAdmin>
      <PageHeader title="Role Management" subtitle="Assign and manage admin roles" showBack />

      {/* Assign Role Card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Assign Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {nonAdminMembers.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
              ))}
              {adminMembers.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} (has roles)</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map(role => (
                <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={assignRole}
            disabled={!selectedUserId || !selectedRole || !!processingId}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Role'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Admin Roles */}
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Current Admin Roles</h3>
      <div className="space-y-2">
        {isLoading ? (
          <Card><CardContent className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : adminMembers.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No admin roles assigned</h3>
            <p className="text-sm text-muted-foreground">Use the form above to assign admin roles</p>
          </CardContent></Card>
        ) : (
          adminMembers.map(member => (
            <Card key={member.user_id} className="animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <p className="font-medium">{member.full_name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.roles.filter(r => r !== 'member').map(role => (
                    <Badge key={role} variant="secondary" className="flex items-center gap-1">
                      {getRoleLabel(role)}
                      <button
                        onClick={() => setRemoveTarget({ userId: member.user_id, role, name: member.full_name })}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {removeTarget && getRoleLabel(removeTarget.role)} role from {removeTarget?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
