import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/constants';
import type { WeeklyContribution } from '@/hooks/useFinancialReports';

interface ContributionsChartProps {
  data: WeeklyContribution[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  amount: {
    label: 'Contributions',
    color: 'hsl(var(--primary))',
  },
};

export function ContributionsChart({ data, isLoading }: ContributionsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weekly Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly Contributions (Last 8 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <BarChart data={data || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <XAxis 
              dataKey="week" 
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value) => formatCurrency(Number(value))}
                />
              } 
            />
            <Bar 
              dataKey="amount" 
              fill="var(--color-amount)" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
