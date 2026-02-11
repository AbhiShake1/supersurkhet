'use client';

import { RadialBar, RadialBarChart } from 'recharts';

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

interface InventoryStatusChartProps {
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const chartConfig = {
  inStock: {
    label: 'In Stock',
    color: 'var(--chart-2)',
  },
  lowStock: {
    label: 'Low Stock',
    color: 'var(--chart-3)',
  },
  outOfStock: {
    label: 'Out of Stock',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig;

export function InventoryStatusChart({
  inStockCount,
  lowStockCount,
  outOfStockCount,
}: InventoryStatusChartProps) {
  const _total = inStockCount + lowStockCount + outOfStockCount;
  const data = [
    {
      name: 'In Stock',
      value: inStockCount,
      fill: 'var(--color-inStock)',
    },
    {
      name: 'Low Stock',
      value: lowStockCount,
      fill: 'var(--color-lowStock)',
    },
    {
      name: 'Out of Stock',
      value: outOfStockCount,
      fill: 'var(--color-outOfStock)',
    },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Inventory Status</CardTitle>
        <CardDescription>Current inventory levels overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={data}
            startAngle={180}
            endAngle={0}
            innerRadius="30%"
            outerRadius="100%"
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="name" hideLabel />}
            />
            <RadialBar dataKey="value" background cornerRadius={10} />
          </RadialBarChart>
        </ChartContainer>
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-[var(--color-inStock)]" />
            <span className="text-sm text-muted-foreground">
              In Stock: {inStockCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-[var(--color-lowStock)]" />
            <span className="text-sm text-muted-foreground">
              Low Stock: {lowStockCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-[var(--color-outOfStock)]" />
            <span className="text-sm text-muted-foreground">
              Out of Stock: {outOfStockCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
