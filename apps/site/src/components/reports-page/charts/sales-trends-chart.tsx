'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface SalesTrendsChartProps {
  data: {
    date: string;
    revenue: number;
  }[];
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function SalesTrendsChart({ data }: SalesTrendsChartProps) {
  // Calculate growth rate for the badge
  let growthRate = 0;
  if (data.length >= 2) {
    const firstValue = data[0].revenue;
    const lastValue = data[data.length - 1].revenue;
    growthRate =
      firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Sales Trends
          {growthRate !== 0 && (
            <Badge
              variant="outline"
              className={`${
                growthRate > 0
                  ? 'text-green-500 bg-green-500/10 border-none ml-2'
                  : 'text-red-500 bg-red-500/10 border-none ml-2'
              }`}
            >
              {growthRate > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4 rotate-180" />
              )}
              <span>{Math.abs(growthRate).toFixed(1)}%</span>
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Sales revenue over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // Format date to show only month/day
                const date = new Date(value);
                return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                // Format large numbers with K (thousands) or M (millions)
                if (value >= 1000000) {
                  return `$${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `$${(value / 1000).toFixed(1)}K`;
                }
                return `$${value}`;
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="revenue"
              type="monotone"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
