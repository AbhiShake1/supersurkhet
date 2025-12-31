import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Package, Building2 } from "lucide-react";
import { useBusinessAnalytics } from "@/hooks/use-business-analytics";

interface ReportsPageProps {
  slug: string;
}

export function ReportsPage({ slug }: ReportsPageProps) {
  const [period, setPeriod] = useState('all');
  const analytics = useBusinessAnalytics(slug, period);

  return (
    <div className="space-y-6">
      <ReportHeader period={period} setPeriod={setPeriod} />
      <FinancialOverview data={analytics} />
      <AccountsSection data={analytics} />
      <PerformanceSection data={analytics} />
    </div>
  );
}

function ReportHeader({ period, setPeriod }: { period: string, setPeriod: (p: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Comprehensive business analytics and insights</p>
      </div>
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FinancialOverview({ data }: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR", // Using NPR as it's a Nepal-focused app
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Costs</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalCosts)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(data.netProfit)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountsSection({ data }: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Accounts Receivable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(data.accountsReceivable)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Accounts Payable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(data.accountsPayable)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceSection({ data }: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Top Suppliers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.topSuppliers.length > 0 ? (
            <div className="space-y-2">
              {data.topSuppliers.map((supplier, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{supplier.name}</span>
                  <span>{formatCurrency(supplier.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Top Products</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.topProducts.length > 0 ? (
            <div className="space-y-2">
              {data.topProducts.map((product, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{product.name}</span>
                  <span>{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}