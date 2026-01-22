import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Percent, Fuel, User } from 'lucide-react';

interface LoanSettings {
  id: string;
  petrol_interest_rate_percent: number;
  personal_interest_rate_percent: number;
  interest_type: string;
}

export default function AdminSettings() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<LoanSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [petrolRate, setPetrolRate] = useState('');
  const [personalRate, setPersonalRate] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('loan_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error loading settings',
        description: error.message,
        variant: 'destructive',
      });
    } else if (data) {
      setSettings(data);
      setPetrolRate(String(data.petrol_interest_rate_percent));
      setPersonalRate(String(data.personal_interest_rate_percent));
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !user) return;

    const petrolRateNum = parseFloat(petrolRate);
    const personalRateNum = parseFloat(personalRate);

    if (isNaN(petrolRateNum) || petrolRateNum < 0 || petrolRateNum > 100) {
      toast({
        title: 'Invalid petrol rate',
        description: 'Please enter a value between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(personalRateNum) || personalRateNum < 0 || personalRateNum > 100) {
      toast({
        title: 'Invalid personal rate',
        description: 'Please enter a value between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('loan_settings')
        .update({
          petrol_interest_rate_percent: petrolRateNum,
          personal_interest_rate_percent: personalRateNum,
        })
        .eq('id', settings.id);

      if (updateError) throw updateError;

      // Log the change
      await supabase.from('audit_log').insert({
        action: 'update_loan_settings',
        entity_type: 'loan_settings',
        entity_id: settings.id,
        actor_user_id: user.id,
        metadata_json: {
          previous: {
            petrol_interest_rate_percent: settings.petrol_interest_rate_percent,
            personal_interest_rate_percent: settings.personal_interest_rate_percent,
          },
          new: {
            petrol_interest_rate_percent: petrolRateNum,
            personal_interest_rate_percent: personalRateNum,
          },
        },
      });

      setSettings({
        ...settings,
        petrol_interest_rate_percent: petrolRateNum,
        personal_interest_rate_percent: personalRateNum,
      });

      toast({
        title: 'Settings updated',
        description: 'Loan interest rates have been saved',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Access denied</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Settings" 
        subtitle="Manage loan interest rates"
        showBack
      />

      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Loan Interest Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="petrol-rate" className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-warning" />
                  Petrol Loan Interest Rate
                </Label>
                <div className="relative">
                  <Input
                    id="petrol-rate"
                    type="number"
                    value={petrolRate}
                    onChange={(e) => setPetrolRate(e.target.value)}
                    className="pr-8"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to weekly petrol loans (max R1,500)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal-rate" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-info" />
                  Personal Loan Interest Rate
                </Label>
                <div className="relative">
                  <Input
                    id="personal-rate"
                    type="number"
                    value={personalRate}
                    onChange={(e) => setPersonalRate(e.target.value)}
                    className="pr-8"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to monthly personal loans (max R5,000)
                </p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  Interest Type: <span className="font-medium">Simple Interest</span>
                </p>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
