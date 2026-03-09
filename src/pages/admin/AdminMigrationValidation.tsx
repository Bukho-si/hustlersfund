import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/constants';
import {
  Loader2, CheckCircle2, XCircle, Shield, Database, ArrowRight, RefreshCw, Wrench
} from 'lucide-react';

interface MemberValidation {
  member_user_id: string;
  member_name: string;
  ledger_contributions: number;
  wallet_contributions: number;
  ledger_petrol: number;
  wallet_petrol: number;
  ledger_personal: number;
  wallet_personal: number;
  ledger_emergency: number;
  wallet_emergency: number;
  ledger_joining: number;
  wallet_joining: number;
  match: boolean;
}

interface MigrationStats {
  totalLedgerRecords: number;
  totalWalletTransactions: number;
  totalMembers: number;
  matchingMembers: number;
  mismatchedMembers: number;
}

export default function AdminMigrationValidation() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixedCount, setFixedCount] = useState<number | null>(null);
  const [validations, setValidations] = useState<MemberValidation[]>([]);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [auditCheck, setAuditCheck] = useState<{ total: number; types: Record<string, number> } | null>(null);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      // Fetch all ledger records
      const { data: ledgerData } = await supabase
        .from('financial_ledger')
        .select('member_user_id, transaction_type, amount');

      // Fetch all wallet transactions
      const { data: walletData } = await supabase
        .from('wallet_transactions')
        .select('member_user_id, transaction_type, amount');

      // Fetch wallet balances
      const { data: walletBalances } = await (supabase as any)
        .from('member_wallets')
        .select('*');

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('user_id, full_name');

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Calculate ledger sums per member
      const ledgerSums = new Map<string, { contributions: number; petrol: number; personal: number; emergency: number; joining: number }>();
      for (const record of (ledgerData || [])) {
        const existing = ledgerSums.get(record.member_user_id) || { contributions: 0, petrol: 0, personal: 0, emergency: 0, joining: 0 };
        const amt = Number(record.amount);
        switch (record.transaction_type) {
          case 'weekly_contribution': existing.contributions += amt; break;
          case 'petrol_loan_issued': existing.petrol += amt; break;
          case 'petrol_loan_repayment': existing.petrol -= amt; break;
          case 'personal_loan_issued': existing.personal += amt; break;
          case 'personal_loan_repayment': existing.personal -= amt; break;
          case 'emergency_contribution': existing.emergency += amt; break;
          case 'joining_fee': existing.joining += amt; break;
          case 'late_fee': case 'cash_fee': existing.contributions += amt; break;
        }
        ledgerSums.set(record.member_user_id, existing);
      }

      // Calculate wallet transaction sums per member
      const walletSums = new Map<string, { contributions: number; petrol: number; personal: number; emergency: number; joining: number }>();
      for (const record of (walletData || [])) {
        const existing = walletSums.get(record.member_user_id) || { contributions: 0, petrol: 0, personal: 0, emergency: 0, joining: 0 };
        const amt = Number(record.amount);
        switch (record.transaction_type) {
          case 'weekly_contribution': existing.contributions += amt; break;
          case 'petrol_loan_issued': existing.petrol += amt; break;
          case 'petrol_loan_repayment': existing.petrol -= amt; break;
          case 'personal_loan_issued': existing.personal += amt; break;
          case 'personal_loan_repayment': existing.personal -= amt; break;
          case 'funeral_contribution': case 'accident_contribution': case 'emergency_contribution':
            existing.emergency += amt; break;
          case 'joining_fee_payment': existing.joining += amt; break;
          case 'late_fee': case 'cash_fee': existing.contributions += amt; break;
        }
        walletSums.set(record.member_user_id, existing);
      }

      // Build validation rows
      const allMemberIds = new Set([...ledgerSums.keys(), ...walletSums.keys()]);
      const results: MemberValidation[] = [];

      for (const memberId of allMemberIds) {
        const l = ledgerSums.get(memberId) || { contributions: 0, petrol: 0, personal: 0, emergency: 0, joining: 0 };
        const w = walletSums.get(memberId) || { contributions: 0, petrol: 0, personal: 0, emergency: 0, joining: 0 };

        const tolerance = 0.01;
        const match = 
          Math.abs(l.contributions - w.contributions) < tolerance &&
          Math.abs(l.petrol - w.petrol) < tolerance &&
          Math.abs(l.personal - w.personal) < tolerance &&
          Math.abs(l.emergency - w.emergency) < tolerance &&
          Math.abs(l.joining - w.joining) < tolerance;

        results.push({
          member_user_id: memberId,
          member_name: nameMap.get(memberId) || 'Unknown',
          ledger_contributions: l.contributions,
          wallet_contributions: w.contributions,
          ledger_petrol: l.petrol,
          wallet_petrol: w.petrol,
          ledger_personal: l.personal,
          wallet_personal: w.personal,
          ledger_emergency: l.emergency,
          wallet_emergency: w.emergency,
          ledger_joining: l.joining,
          wallet_joining: w.joining,
          match,
        });
      }

      const matchingMembers = results.filter(r => r.match).length;

      setValidations(results);
      setStats({
        totalLedgerRecords: ledgerData?.length || 0,
        totalWalletTransactions: walletData?.length || 0,
        totalMembers: allMemberIds.size,
        matchingMembers,
        mismatchedMembers: results.length - matchingMembers,
      });

      // Audit log check
      const { data: auditData } = await supabase
        .from('audit_log')
        .select('action');

      const typeCounts: Record<string, number> = {};
      for (const a of (auditData || [])) {
        typeCounts[a.action] = (typeCounts[a.action] || 0) + 1;
      }

      setAuditCheck({
        total: auditData?.length || 0,
        types: typeCounts,
      });

      toast({ title: 'Validation complete' });
    } catch (err: any) {
      toast({ title: 'Validation failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AppLayout requireAdmin>
      <PageHeader
        title="Migration Validation"
        subtitle="Compare ledger records vs wallet transactions"
        showBack
      />

      <div className="space-y-4">
        <Button
          onClick={runValidation}
          disabled={isRunning}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run Validation
        </Button>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Ledger Records</p>
                <p className="text-lg font-bold">{stats.totalLedgerRecords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Wallet Transactions</p>
                <p className="text-lg font-bold">{stats.totalWalletTransactions}</p>
              </CardContent>
            </Card>
            <Card className={stats.mismatchedMembers === 0 ? 'ring-2 ring-success' : 'ring-2 ring-destructive'}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Matching</p>
                <p className="text-lg font-bold text-success">{stats.matchingMembers}/{stats.totalMembers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Mismatched</p>
                <p className={`text-lg font-bold ${stats.mismatchedMembers > 0 ? 'text-destructive' : 'text-success'}`}>
                  {stats.mismatchedMembers}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Audit Log Check */}
        {auditCheck && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Audit Log ({auditCheck.total} entries)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-2">
                {Object.entries(auditCheck.types).map(([action, count]) => (
                  <Badge key={action} variant="outline" className="text-[10px]">
                    {action}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Member-by-member validation */}
        {validations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-info" />
                Per-Member Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Member</TableHead>
                      <TableHead className="text-xs">Contributions</TableHead>
                      <TableHead className="text-xs">Petrol</TableHead>
                      <TableHead className="text-xs">Personal</TableHead>
                      <TableHead className="text-xs">Emergency</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validations.map((v) => (
                      <TableRow key={v.member_user_id} className={v.match ? '' : 'bg-destructive/5'}>
                        <TableCell className="text-xs font-medium">{v.member_name}</TableCell>
                        <TableCell className="text-[10px]">
                          <span className="text-muted-foreground">L:</span>{formatCurrency(v.ledger_contributions)}
                          <ArrowRight className="h-2 w-2 inline mx-0.5" />
                          <span className="text-muted-foreground">W:</span>{formatCurrency(v.wallet_contributions)}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          <span className="text-muted-foreground">L:</span>{formatCurrency(v.ledger_petrol)}
                          <ArrowRight className="h-2 w-2 inline mx-0.5" />
                          <span className="text-muted-foreground">W:</span>{formatCurrency(v.wallet_petrol)}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          <span className="text-muted-foreground">L:</span>{formatCurrency(v.ledger_personal)}
                          <ArrowRight className="h-2 w-2 inline mx-0.5" />
                          <span className="text-muted-foreground">W:</span>{formatCurrency(v.wallet_personal)}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          <span className="text-muted-foreground">L:</span>{formatCurrency(v.ledger_emergency)}
                          <ArrowRight className="h-2 w-2 inline mx-0.5" />
                          <span className="text-muted-foreground">W:</span>{formatCurrency(v.wallet_emergency)}
                        </TableCell>
                        <TableCell>
                          {v.match ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
