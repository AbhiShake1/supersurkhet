'use client';

import { Pie, PieChart } from 'recharts';
import React from 'react';

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
} from '@/components/ui/chart';
import { CreditCard, Wallet, Banknote, PiggyBank } from 'lucide-react';

interface PaymentMethodsChartProps {
  data: {
    method: string;
    amount: number;
  }[];
}

// Define colors for different payment methods
const paymentMethodColors: Record<string, string> = {
  cash: 'var(--chart-1)',
  card: 'var(--chart-2)',
  bankTransfer: 'var(--chart-3)',
  credit: 'var(--chart-4)',
  default: 'var(--chart-5)',
};

// Get icon for payment method
const getPaymentIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash':
      return <Banknote className="h-4 w-4" />;
    case 'card':
      return <CreditCard className="h-4 w-4" />;
    case 'banktransfer':
      return <PiggyBank className="h-4 w-4" />;
    case 'credit':
      return <Wallet className="h-4 w-4" />;
    default:
      return <Banknote className="h-4 w-4" />;
  }
};

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  // Calculate total amount for percentage calculation
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  // Prepare chart config based on actual data
  const chartConfig = data.reduce((config, item) => {
    config[item.method] = {
      label: item.method.charAt(0).toUpperCase() + item.method.slice(1),
      color:
        paymentMethodColors[item.method.toLowerCase()] ||
        paymentMethodColors.default,
    };
    return config;
  }, {} as ChartConfig);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Breakdown of payment methods used</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const percentage =
                    totalAmount > 0
                      ? ((item.amount / totalAmount) * 100).toFixed(1)
                      : 0;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {item.method}
                          </span>
                          <span className="font-bold">
                            {getPaymentIcon(item.method)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Amount
                          </span>
                          <span className="font-bold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'NPR',
                              minimumFractionDigits: 2,
                            }).format(item.amount)}
                          </span>
                          <span className="text-[0.70rem] text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="method"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.map((_entry, index) => (
                <React.Fragment key={`cell-${// biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
index}`}>
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x="50%"
                      y="50%"
                      className="text-lg font-bold fill-foreground"
                    >
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'NPR',
                        minimumFractionDigits: 2,
                      }).format(totalAmount)}
                    </tspan>
                    <tspan
                      x="50%"
                      y="60%"
                      className="text-sm fill-muted-foreground"
                    >
                      Total
                    </tspan>
                  </text>
                </React.Fragment>
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 flex justify-center gap-4">
          {data.map((item, index) => {
            const percentage =
              totalAmount > 0
                ? ((item.amount / totalAmount) * 100).toFixed(1)
                : 0;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
<div key={index} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{
                    backgroundColor:
                      paymentMethodColors[item.method.toLowerCase()] ||
                      paymentMethodColors.default,
                  }}
                />
                <div className="flex items-center gap-1">
                  {getPaymentIcon(item.method)}
                  <span className="text-xs text-muted-foreground">
                    {item.method} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
