import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
  useContributionSettings,
  useUpdateContributionSettings,
  ContributionSettings,
} from '@/hooks/useContributionSettings';
import { formatCurrency } from '@/lib/constants';
import { ArrowLeft, Save, X, DollarSign, Wallet, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SettingField {
  key: keyof Omit<ContributionSettings, 'id' | 'updated_at'>;
  label: string;
  description: string;
  category: 'fees' | 'loans' | 'emergency';
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'joining_fee_amount',
    label: 'Joining Fee',
    description: 'One-time fee for new members (per slot)',
    category: 'fees',
  },
  {
    key: 'weekly_subscription_amount',
    label: 'Weekly Subscription',
    description: 'Weekly contribution amount (per slot)',
    category: 'fees',
  },
  {
    key: 'late_fine_amount',
    label: 'Late Payment Fine',
    description: 'Penalty for payments after deadline',
    category: 'fees',
  },
  {
    key: 'cash_atm_fee_amount',
    label: 'Cash/ATM Fee',
    description: 'Processing fee for cash deposits',
    category: 'fees',
  },
  {
    key: 'petrol_loan_weekly_cap',
    label: 'Petrol Loan Weekly Cap',
    description: 'Maximum petrol loan per week (per slot)',
    category: 'loans',
  },
  {
    key: 'personal_loan_monthly_cap',
    label: 'Personal Loan Monthly Cap',
    description: 'Maximum personal loan per month (per slot)',
    category: 'loans',
  },
  {
    key: 'funeral_emergency_amount',
    label: 'Funeral Contribution',
    description: 'Fixed amount per funeral event',
    category: 'emergency',
  },
  {
    key: 'accident_emergency_amount',
    label: 'Accident Contribution',
    description: 'Fixed amount per accident event',
    category: 'emergency',
  },
  {
    key: 'loss_of_member_amount',
    label: 'Loss of Member Contribution',
    description: 'Fixed amount when a member passes away (R500)',
    category: 'emergency',
  },
  {
    key: 'loss_of_beneficiary_amount',
    label: 'Loss of Beneficiary Contribution',
    description: 'Fixed amount when a member beneficiary passes away (R200)',
    category: 'emergency',
  },
];

export default function AdminContributionSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, isLoading } = useContributionSettings();
  const updateSettings = useUpdateContributionSettings();

  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form values when settings load
  useEffect(() => {
    if (settings) {
      const values: Record<string, number> = {};
      SETTING_FIELDS.forEach((field) => {
        values[field.key] = settings[field.key];
      });
      setFormValues(values);
    }
  }, [settings]);

  // Check for changes
  useEffect(() => {
    if (settings) {
      const changed = SETTING_FIELDS.some(
        (field) => formValues[field.key] !== settings[field.key]
      );
      setHasChanges(changed);
    }
  }, [formValues, settings]);

  const handleInputChange = (key: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Validate
    if (isNaN(numValue)) {
      setErrors((prev) => ({ ...prev, [key]: 'Must be a valid number' }));
    } else if (numValue < 0) {
      setErrors((prev) => ({ ...prev, [key]: 'Must be 0 or greater' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    setFormValues((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleSave = async () => {
    if (!user || Object.keys(errors).length > 0) return;

    const newSettings: Partial<Omit<ContributionSettings, 'id' | 'updated_at'>> = {};
    SETTING_FIELDS.forEach((field) => {
      newSettings[field.key] = formValues[field.key];
    });

    await updateSettings.mutateAsync({
      newSettings,
      oldSettings: settings,
      actorUserId: user.id,
    });
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  const renderFieldGroup = (category: 'fees' | 'loans' | 'emergency', title: string, icon: React.ReactNode) => {
    const fields = SETTING_FIELDS.filter((f) => f.category === category);

    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">R</span>
                {isLoading ? (
                  <Skeleton className="h-10 flex-1" />
                ) : (
                  <Input
                    id={field.key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className={errors[field.key] ? 'border-destructive' : ''}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{field.description}</p>
              {errors[field.key] && (
                <p className="text-xs text-destructive">{errors[field.key]}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Contribution Settings"
        subtitle="Manage all contribution amounts"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="space-y-4 pb-24">
        {renderFieldGroup(
          'fees',
          'Fees & Subscriptions',
          <DollarSign className="h-4 w-4 text-primary" />
        )}

        {renderFieldGroup(
          'loans',
          'Loan Caps',
          <Wallet className="h-4 w-4 text-info" />
        )}

        {renderFieldGroup(
          'emergency',
          'Emergency Contributions',
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}

        {/* Preview of current values */}
        {!isLoading && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardDescription>Current Values Preview</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              {SETTING_FIELDS.map((field) => (
                <div key={field.key} className="flex justify-between">
                  <span className="text-muted-foreground">{field.label}:</span>
                  <span className="font-medium">{formatCurrency(formValues[field.key] ?? 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={updateSettings.isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges || Object.keys(errors).length > 0 || updateSettings.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
