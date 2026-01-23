import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/constants';
import type { LoanDistribution } from '@/hooks/useFinancialReports';

interface LoanDistributionChartProps {
  data: LoanDistribution[] | undefined;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))'];

const chartConfig = {
  petrol: {
    label: 'Petrol',
    color: COLORS[0],
  },
  personal: {
    label: 'Personal',
    color: COLORS[1],
  },
  other: {
    label: 'Other',
    color: COLORS[2],
  },
};

export function LoanDistributionChart({ data, isLoading }: LoanDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Loan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Loan Distribution by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px]">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No active loans
          </div>
        )}
      </CardContent>
    </Card>
  );
}
