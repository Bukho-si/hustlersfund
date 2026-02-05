import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/constants';
import { Search, Users, Pencil } from 'lucide-react';
import type { MemberBalance } from '@/hooks/useFinancialReports';
import { EditMemberContributionDialog } from './EditMemberContributionDialog';

interface MemberBalancesTableProps {
  balances: MemberBalance[] | undefined;
  isLoading: boolean;
}

export function MemberBalancesTable({ balances, isLoading }: MemberBalancesTableProps) {
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberBalance | null>(null);

  const filteredBalances = balances?.filter((b) =>
    b.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (member: MemberBalance) => {
    setSelectedMember(member);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Member Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium">Member Balances</CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs text-center">Slots</TableHead>
                  <TableHead className="text-xs text-right">Contributions</TableHead>
                  <TableHead className="text-xs text-right">Loans</TableHead>
                  <TableHead className="text-xs text-right">Emergency</TableHead>
                  <TableHead className="text-xs text-right">Net</TableHead>
                  <TableHead className="text-xs text-center w-16">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances && filteredBalances.length > 0 ? (
                  filteredBalances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="text-sm font-medium">{balance.fullName}</TableCell>
                      <TableCell className="text-center">
                        {balance.membershipSlots > 1 ? (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {balance.membershipSlots}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">1</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right text-success">
                        {formatCurrency(balance.totalContributions)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-info">
                        {formatCurrency(balance.outstandingLoans)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-warning">
                        {formatCurrency(balance.emergencyDues)}
                      </TableCell>
                      <TableCell className={`text-sm text-right font-medium ${
                        balance.netPosition >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(balance.netPosition)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditClick(balance)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditMemberContributionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        member={selectedMember}
      />
    </>
  );
}