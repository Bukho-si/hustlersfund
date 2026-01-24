import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/constants';
import { User, Car, Phone, LogOut, Loader2, Save } from 'lucide-react';

interface MemberProfile {
  full_name: string;
  phone: string | null;
  vehicle_reg: string | null;
  uber_driver_id: string | null;
  status: string;
  joining_fee_paid: boolean;
  join_date: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [uberDriverId, setUberDriverId] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
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

      toast({
        title: 'Profile updated!',
        description: 'Your changes have been saved',
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
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

  return (
    <AppLayout>
      <PageHeader title="Profile" subtitle="Manage your account" />

      {/* Status Card */}
      {profile && (
        <Card className="mb-4 bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-1">Member Status</p>
                <StatusBadge status={profile.status} variant="member" />
              </div>
              <div className="text-right">
                <p className="text-primary-foreground/70 text-xs mb-1">Member Since</p>
                <p className="font-medium">{formatDate(profile.join_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Personal Information</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 082 123 4567"
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Driver Information</p>
                <p className="text-xs text-muted-foreground">Your Uber details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="vehicleReg">Vehicle Registration</Label>
                <Input
                  id="vehicleReg"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="e.g. CA 123 456"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="uberDriverId">Uber Driver ID</Label>
                <Input
                  id="uberDriverId"
                  value={uberDriverId}
                  onChange={(e) => setUberDriverId(e.target.value)}
                  placeholder="Your Uber driver ID"
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave}
          className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </>
          )}
        </Button>

        <Button 
          variant="outline"
          onClick={handleSignOut}
          className="w-full h-12"
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
