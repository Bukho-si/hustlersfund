import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Percent, Fuel, User, Clock, Banknote, Wallet } from 'lucide-react';

interface LoanSettings {
  id: string;
  petrol_interest_rate_percent: number;
  personal_interest_rate_percent: number;
  interest_type: string;
  petrol_repayment_days: number;
  personal_repayment_days: number;
}

export default function AdminSettings() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<LoanSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [petrolRate, setPetrolRate] = useState('');
  const [personalRate, setPersonalRate] = useState('');
  const [petrolRepayDays, setPetrolRepayDays] = useState('7');
  const [personalRepayDays, setPersonalRepayDays] = useState('30');

  // Petrol request window
  const [windowStart, setWindowStart] = useState('06:00');
  const [windowEnd, setWindowEnd] = useState('10:00');
  const [windowActive, setWindowActive] = useState(true);
  const [windowId, setWindowId] = useState<string | null>(null);

  // Petrol fund
  const [fundBalance, setFundBalance] = useState('');
  const [fundThreshold, setFundThreshold] = useState('');
  const [fundId, setFundId] = useState<string | null>(null);

  // Personal loan fund
  const [personalFundBalance, setPersonalFundBalance] = useState('');
  const [personalFundThreshold, setPersonalFundThreshold] = useState('');
  const [personalFundId, setPersonalFundId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [settingsRes, windowRes, fundRes, personalFundRes] = await Promise.all([
      supabase.from('loan_settings').select('*').limit(1).maybeSingle(),
      supabase.from('petrol_request_window').select('*').limit(1).maybeSingle(),
      supabase.from('petrol_fund').select('*').limit(1).maybeSingle(),
      supabase.from('personal_loan_fund').select('*').limit(1).maybeSingle(),
    ]);

    if (settingsRes.data) {
      setSettings(settingsRes.data as any);
      setPetrolRate(String(settingsRes.data.petrol_interest_rate_percent));
      setPersonalRate(String(settingsRes.data.personal_interest_rate_percent));
      setPetrolRepayDays(String((settingsRes.data as any).petrol_repayment_days ?? 7));
      setPersonalRepayDays(String((settingsRes.data as any).personal_repayment_days ?? 30));
    }

    if (windowRes.data) {
      const w = windowRes.data as any;
      setWindowId(w.id);
      setWindowStart(w.start_time?.slice(0, 5) || '06:00');
      setWindowEnd(w.end_time?.slice(0, 5) || '10:00');
      setWindowActive(w.active ?? true);
    }

    if (fundRes.data) {
      const f = fundRes.data as any;
      setFundId(f.id);
      setFundBalance(String(f.current_balance));
      setFundThreshold(String(f.low_balance_threshold));
    }

    if (personalFundRes.data) {
      const pf = personalFundRes.data as any;
      setPersonalFundId(pf.id);
      setPersonalFundBalance(String(pf.current_balance));
      setPersonalFundThreshold(String(pf.low_balance_threshold));
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !user) return;

    const petrolRateNum = parseFloat(petrolRate);
    const personalRateNum = parseFloat(personalRate);

    if (isNaN(petrolRateNum) || petrolRateNum < 0 || petrolRateNum > 100) {
      toast({ title: 'Invalid petrol rate', description: 'Enter 0-100', variant: 'destructive' });
      return;
    }
    if (isNaN(personalRateNum) || personalRateNum < 0 || personalRateNum > 100) {
      toast({ title: 'Invalid personal rate', description: 'Enter 0-100', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      // Update loan settings
      const petrolDaysNum = parseInt(petrolRepayDays) || 7;
      const personalDaysNum = parseInt(personalRepayDays) || 30;

      const { error: updateError } = await supabase
        .from('loan_settings')
        .update({
          petrol_interest_rate_percent: petrolRateNum,
          personal_interest_rate_percent: personalRateNum,
          petrol_repayment_days: petrolDaysNum,
          personal_repayment_days: personalDaysNum,
        } as any)
        .eq('id', settings.id);

      if (updateError) throw updateError;

      // Update request window
      if (windowId) {
        await supabase
          .from('petrol_request_window')
          .update({
            start_time: windowStart + ':00',
            end_time: windowEnd + ':00',
            active: windowActive,
          })
          .eq('id', windowId);
      }

      // Update fund threshold
      if (fundId) {
        const balanceNum = parseFloat(fundBalance);
        const thresholdNum = parseFloat(fundThreshold);
        if (!isNaN(balanceNum) && !isNaN(thresholdNum)) {
          await supabase
            .from('petrol_fund')
            .update({
              current_balance: balanceNum,
              low_balance_threshold: thresholdNum,
            })
            .eq('id', fundId);
        }
      }

      // Update personal loan fund
      if (personalFundId) {
        const pBalanceNum = parseFloat(personalFundBalance);
        const pThresholdNum = parseFloat(personalFundThreshold);
        if (!isNaN(pBalanceNum) && !isNaN(pThresholdNum)) {
          await supabase
            .from('personal_loan_fund')
            .update({
              current_balance: pBalanceNum,
              low_balance_threshold: pThresholdNum,
            })
            .eq('id', personalFundId);
        }
      }

      // Audit log
      await supabase.from('audit_log').insert({
        action: 'update_settings',
        entity_type: 'settings',
        entity_id: settings.id,
        actor_user_id: user.id,
        metadata_json: {
          petrol_interest_rate_percent: petrolRateNum,
          personal_interest_rate_percent: personalRateNum,
          request_window: { start: windowStart, end: windowEnd, active: windowActive },
        },
      });

      setSettings({
        ...settings,
        petrol_interest_rate_percent: petrolRateNum,
        personal_interest_rate_percent: personalRateNum,
      });

      toast({ title: 'Settings updated' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
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
        subtitle="Manage loan rates, petrol fund & request windows"
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
          {/* Interest Rates */}
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
                  <Input id="petrol-rate" type="number" value={petrolRate} onChange={(e) => setPetrolRate(e.target.value)} className="pr-8" min="0" max="100" step="0.1" />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal-rate" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-info" />
                  Personal Loan Interest Rate
                </Label>
                <div className="relative">
                  <Input id="personal-rate" type="number" value={personalRate} onChange={(e) => setPersonalRate(e.target.value)} className="pr-8" min="0" max="100" step="0.1" />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Petrol Request Window */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-warning" />
                Petrol Loan Request Window
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Time Window</Label>
                <Switch checked={windowActive} onCheckedChange={setWindowActive} />
              </div>
              {windowActive && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="window-start">Start Time</Label>
                    <Input id="window-start" type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="window-end">End Time</Label>
                    <Input id="window-end" type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Members can only submit petrol loan requests within this time window (SA time).
              </p>
            </CardContent>
          </Card>

          {/* Petrol Fund */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5 text-accent" />
                Petrol Fund
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fund-balance">Current Balance (R)</Label>
                <Input id="fund-balance" type="number" value={fundBalance} onChange={(e) => setFundBalance(e.target.value)} min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fund-threshold">Low Balance Alert Threshold (R)</Label>
                <Input id="fund-threshold" type="number" value={fundThreshold} onChange={(e) => setFundThreshold(e.target.value)} min="0" step="0.01" />
              </div>
              <p className="text-xs text-muted-foreground">
                A warning banner will appear when the fund drops below this threshold.
              </p>
            </CardContent>
          </Card>

          {/* Personal Loan Fund */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-info" />
                Personal Loan Fund
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personal-fund-balance">Current Balance (R)</Label>
                <Input id="personal-fund-balance" type="number" value={personalFundBalance} onChange={(e) => setPersonalFundBalance(e.target.value)} min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal-fund-threshold">Low Balance Alert Threshold (R)</Label>
                <Input id="personal-fund-threshold" type="number" value={personalFundThreshold} onChange={(e) => setPersonalFundThreshold(e.target.value)} min="0" step="0.01" />
              </div>
              <p className="text-xs text-muted-foreground">
                A warning banner will appear on the Personal Loans dashboard when the fund drops below this threshold.
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save All Settings'}
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
