import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverablePopover,
  HoverablePopoverContent,
  HoverablePopoverTrigger,
} from "@/components/ui/hoverable-popover";
import { Info } from "lucide-react";
import { useBusinessAnalytics } from "@/hooks/use-business-analytics";
import { api } from "@/lib/api";
import {
  exportAnalyticsToCSV,
  exportAnalyticsToJSON,
  generatePrintHTML,
} from "@/lib/export-analytics";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  DollarSign,
  Download,
  Package,
  Package2,
  Printer,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  InventoryStatusChart,
  PaymentMethodsChart,
  SalesTrendsChart,
} from "./reports-page/charts";
import { CardDescription } from "./ui/card-hover-effect";
import { formatCurrency } from "@/lib/intl";

interface ReportsPageProps {
  slug: string;
}

export function RetailReportsPage({ slug }: ReportsPageProps) {
  const [period, setPeriod] = useState("all");
  const analytics = useBusinessAnalytics(slug, period);

  // Get business name for print header
  const { data: businesses = [] } = api.business.useGet({
    keys: [slug],
    single: true,
  });
  const businessName = businesses[0]?.name || slug;

  const handleExport = (format: "csv" | "json" | "print") => {
    if (format === "csv") {
      const csvContent = exportAnalyticsToCSV(analytics, period);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `business-reports-${slug}-${period}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "json") {
      const jsonData = exportAnalyticsToJSON(analytics, period);
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `business-reports-${slug}-${period}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "print") {
      const printHTML = generatePrintHTML(analytics, period, businessName);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        period={period}
        setPeriod={setPeriod}
        onExport={handleExport}
      />
      <FinancialOverview data={analytics} />
      <SalesAndTrendsSection data={analytics} />
      <InventorySection data={analytics} />
      <CustomerSection data={analytics} />
      <AccountsSection data={analytics} />
      <PerformanceSection data={analytics} />
    </div>
  );
}

function ReportHeader({
  period,
  setPeriod,
  onExport,
}: {
  period: string;
  setPeriod: (p: string) => void;
  onExport: (format: "csv" | "json" | "print") => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Reports</h1>
        <p className="text-muted-foreground">
          Comprehensive business analytics and insights
        </p>
      </div>
      <div className="flex items-center gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-md border hover:bg-accent"
              aria-label="Export reports"
            >
              <Download className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport("csv")}>
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("json")}>
              <Download className="mr-2 h-4 w-4" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("print")}>
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function FinancialOverview({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR", // Using NPR as it's a Nepal-focused app
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Revenue
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalRevenue)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Costs
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalCosts)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Profit
          </CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {formatCurrency(data.netProfit)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesAndTrendsSection({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Sales Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.salesTrends.length > 0 ? (
            <SalesTrendsChart data={data.salesTrends} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sales data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Methods</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.paymentMethods.length > 0 ? (
            <PaymentMethodsChart data={data.paymentMethods} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payment method data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InventorySection({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  // Calculate inventory counts
  const inStockCount = data.currentInventory.filter(
    (item) => item.currentStock > (item.product.reorderLevel || 5),
  ).length;
  const lowStockCount = data.lowStockItems.length;
  const outOfStockCount = data.outOfStockItems.length;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Inventory Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <InventoryStatusChart
              inStockCount={inStockCount}
              lowStockCount={lowStockCount}
              outOfStockCount={outOfStockCount}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Low Stock Items</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockItems.map((item) => (
                  <div
                    key={item.product._?.soul || item.product.title}
                    className="flex justify-between items-center"
                  >
                    <span className="truncate max-w-[60%]">
                      {item.product.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.currentStock} left (reorder at{" "}
                      {item.product.reorderLevel || 5})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No low stock items</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Current Inventory</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Current Stock</th>
                    <th className="text-right py-2">Reorder Level</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.currentInventory.slice(0, 10).map((item) => (
                    <tr
                      key={item.product._?.soul || item.product.title}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2">{item.product.title}</td>
                      <td className="text-right py-2">{item.currentStock}</td>
                      <td className="text-right py-2">
                        {item.product.reorderLevel || 5}
                      </td>
                      <td className="text-right py-2">
                        {item.currentStock <= 0 ? (
                          <span className="text-red-500">Out of Stock</span>
                        ) : item.currentStock <=
                          (item.product.reorderLevel || 5) ? (
                          <span className="text-amber-500">Low Stock</span>
                        ) : (
                          <span className="text-emerald-500">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CustomerSection({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Top Customers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.customerPurchaseHistory.length > 0 ? (
            <div className="space-y-2">
              {data.customerPurchaseHistory.map((customer) => (
                <div
                  key={`${customer.name}-${customer.totalSpent}`}
                  className="flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.purchaseCount} purchases
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatCurrency(customer.totalSpent)}</div>
                    <div className="text-sm text-muted-foreground">
                      Last:{" "}
                      {new Date(customer.lastPurchase).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No customer data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AccountsSection({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function to render detailed breakdown table
  const renderReceivableBreakdown = () => {
    if (!data.accountsReceivableBreakdown || data.accountsReceivableBreakdown.length === 0) {
      return <p className="text-muted-foreground text-sm">No outstanding receivables</p>;
    }

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-lg text-amber-600">Outstanding Customer Payments</h4>
        <div className="space-y-3">
          {data.accountsReceivableBreakdown.map((item, index) => (
            <div key={item.id || index} className="border rounded-lg p-3 bg-card shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-foreground">
                  <span className="font-semibold">Customer:</span> {item.customer}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600">{formatCurrency(item.dueAmount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2 pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Total:</span><br />
                  <span className="font-medium">{formatCurrency(item.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span><br />
                  <span className="font-medium">{formatCurrency(item.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due:</span><br />
                  <span className="font-bold text-amber-600">{formatCurrency(item.dueAmount)}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-medium text-sm mb-1 flex items-center">
                  <span className="mr-2">🛒</span> Products Purchased
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {item.items.map((product, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                      <div className="flex-1 truncate pr-2" title={product.product}>
                        {product.product}
                      </div>
                      <div className="text-right">
                        <div>{product.quantity} {product.unit && <sub className="text-muted-foreground">${product.unit}</sub>} × {formatCurrency(product.unitPrice)}</div>
                        <div className="text-xs text-muted-foreground">= {formatCurrency(product.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to render payable breakdown table
  const renderPayableBreakdown = () => {
    if (!data.accountsPayableBreakdown || data.accountsPayableBreakdown.length === 0) {
      return <p className="text-muted-foreground text-sm">No outstanding payables</p>;
    }

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-lg text-red-600">Outstanding Supplier Payments</h4>
        <div className="space-y-3">
          {data.accountsPayableBreakdown.map((item, index) => (
            <div key={item.id || index} className="border rounded-lg p-3 bg-card shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-foreground">
                  <span className="font-semibold">Supplier:</span> {item.supplier}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">{formatCurrency(item.dueAmount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2 pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Total:</span><br />
                  <span className="font-medium">{formatCurrency(item.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span><br />
                  <span className="font-medium">{formatCurrency(item.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due:</span><br />
                  <span className="font-bold text-red-600">{formatCurrency(item.dueAmount)}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-medium text-sm mb-1 flex items-center">
                  <span className="mr-2">📦</span> Products Received
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {item.items.map((product, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                      <div className="flex-1 truncate pr-2" title={product.product}>
                        {product.product}
                      </div>
                      <div className="text-right">
                        <div>{product.quantity} {product.unit && <sub className="text-muted-foreground">{product.unit}</sub>} × {formatCurrency(product.unitPrice)}</div>
                        <div className="text-xs text-muted-foreground">= {formatCurrency(product.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Accounts Receivable</CardTitle>
            <HoverablePopover>
              <HoverablePopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-4 w-4" />
                </button>
              </HoverablePopoverTrigger>
              <HoverablePopoverContent className="w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto p-4">
                {renderReceivableBreakdown()}
              </HoverablePopoverContent>
            </HoverablePopover>
          </div>
          <CardDescription>
            Amount to be received from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-amber-600">
            {formatCurrency(data.accountsReceivable)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            Outstanding payments from sales
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Accounts Payable</CardTitle>
            <HoverablePopover>
              <HoverablePopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="h-4 w-4" />
                </button>
              </HoverablePopoverTrigger>
              <HoverablePopoverContent className="w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto p-4">
                {renderPayableBreakdown()}
              </HoverablePopoverContent>
            </HoverablePopover>
          </div>
          <CardDescription>Amount owed to suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-red-600">
            {formatCurrency(data.accountsPayable)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Outstanding payments to suppliers
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceSection({
  data,
}: { data: ReturnType<typeof useBusinessAnalytics> }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2,
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
              {data.topSuppliers.map((supplier) => (
                <div
                  key={`${supplier.name}-${supplier.total}`}
                  className="flex justify-between"
                >
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
              {data.topProducts.map((product) => (
                <div
                  key={`${product.name}-${product.revenue}`}
                  className="flex justify-between"
                >
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
