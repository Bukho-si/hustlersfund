import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMyWallet } from '@/hooks/useWallet';
import { formatDate, formatCurrency } from '@/lib/constants';
import { useContributionSettings, getJoiningFeeTotal, getJoiningFeeRemaining } from '@/hooks/useContributionSettings';
import { User, Car, Phone, LogOut, Loader2, Save, Users, CreditCard, Download, Wallet, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MemberProfile {
  full_name: string;
  phone: string | null;
  vehicle_reg: string | null;
  uber_driver_id: string | null;
  status: string;
  joining_fee_paid: boolean;
  joining_fee_paid_total: number;
  membership_slots: number;
  join_date: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [uberDriverId, setUberDriverId] = useState('');

  const { data: wallet } = useMyWallet(user?.id);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setVehicleReg(data.vehicle_reg || '');
      setUberDriverId(data.uber_driver_id || '');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('member_profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          vehicle_reg: vehicleReg.trim() || null,
          uber_driver_id: uberDriverId.trim() || null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated!', description: 'Your changes have been saved' });
      fetchProfile();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  const slots = profile?.membership_slots || 1;
  const joiningFeeTotal = getJoiningFeeTotal(slots);
  const joiningFeePaid = profile?.joining_fee_paid_total || 0;
  const joiningFeeRemaining = getJoiningFeeRemaining(slots, joiningFeePaid);
  const joiningFeeProgress = (joiningFeePaid / joiningFeeTotal) * 100;

  return (
    <AppLayout>
      <PageHeader title="Profile" subtitle="Manage your account" />

      {/* Status Card */}
      {profile && (
        <Card className="mb-4 bg-primary text-primary-foreground animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-accent/10 -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/60 text-xs font-medium mb-1.5">Member Status</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={profile.status} variant="member" />
                  {slots > 1 && (
                    <Badge variant="outline" className="text-xs border-primary-foreground/20 text-primary-foreground rounded-full">
                      <Users className="h-3 w-3 mr-1" />
                      {slots} slots
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-primary-foreground/60 text-xs font-medium mb-1">Member Since</p>
                <p className="font-semibold text-sm">{formatDate(profile.join_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Quick View */}
      <Link to="/wallet" className="block mb-4">
        <Card className="hover:shadow-md transition-all duration-200 animate-fade-in border-border/50" style={{ animationDelay: '0.05s' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="fintech-icon-box bg-success/10">
                  <Wallet className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-sm">My Wallet</p>
                  <p className="text-xs text-muted-foreground">View balances & transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{formatCurrency((wallet?.contribution_balance || 0) + (wallet?.joining_fee_balance || 0))}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Membership & Joining Fee */}
      {profile && (
        <Card className="mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-5 space-y-4">
            <div className="fintech-section-header">
              <div className="fintech-icon-box bg-info/10">
                <CreditCard className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-semibold text-sm">Membership Details</p>
                <p className="text-xs text-muted-foreground">Slots and joining fee status</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Membership Slots</span>
                <Badge variant="secondary" className="rounded-full">
                  <Users className="h-3 w-3 mr-1" />
                  {slots} {slots === 1 ? 'slot' : 'slots'}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Joining Fee Progress</span>
                  <span className="font-semibold">
                    {formatCurrency(joiningFeePaid)} of {formatCurrency(joiningFeeTotal)}
                  </span>
                </div>
                <Progress value={joiningFeeProgress} className="h-2.5" />
                {joiningFeeRemaining > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formatCurrency(joiningFeeRemaining)} remaining
                  </p>
                ) : (
                  <p className="text-xs text-success mt-1.5 font-medium">✓ Fully paid</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      <div className="space-y-4">
        <Card className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <CardContent className="p-5 space-y-4">
            <div className="fintech-section-header">
              <div className="fintech-icon-box bg-accent/10">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Personal Information</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName" className="text-xs font-medium text-muted-foreground">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1.5 fintech-input" />
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 082 123 4567" className="mt-1.5 fintech-input" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-5 space-y-4">
            <div className="fintech-section-header">
              <div className="fintech-icon-box bg-warning/10">
                <Car className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-sm">Driver Information</p>
                <p className="text-xs text-muted-foreground">Your Uber details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="vehicleReg" className="text-xs font-medium text-muted-foreground">Vehicle Registration</Label>
                <Input id="vehicleReg" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="e.g. CA 123 456" className="mt-1.5 fintech-input" />
              </div>
              <div>
                <Label htmlFor="uberDriverId" className="text-xs font-medium text-muted-foreground">Uber Driver ID</Label>
                <Input id="uberDriverId" value={uberDriverId} onChange={(e) => setUberDriverId(e.target.value)} placeholder="Your Uber driver ID" className="mt-1.5 fintech-input" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full fintech-btn-primary" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5 mr-2" />Save Changes</>}
        </Button>

        <Link to="/install" className="block">
          <Button variant="outline" className="w-full fintech-btn-outline">
            <Download className="h-5 w-5 mr-2" />Install App
          </Button>
        </Link>

        <Button variant="outline" onClick={handleSignOut} className="w-full fintech-btn-outline text-destructive hover:text-destructive" disabled={isSigningOut}>
          {isSigningOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogOut className="h-5 w-5 mr-2" />Sign Out</>}
        </Button>
      </div>
    </AppLayout>
  );
}
