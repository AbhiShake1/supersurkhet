import { useBusinessAnalytics } from "@/hooks/use-business-analytics";

// Export analytics data to CSV format
export function exportAnalyticsToCSV(analytics: ReturnType<typeof useBusinessAnalytics>, period: string) {
  // Create CSV content for sales trends
  let csvContent = "Sales Trends Report\n";
  csvContent += `Period: ${period}\n\n`;

  csvContent += "Date,Revenue\n";
  analytics.salesTrends.forEach(trend => {
    csvContent += `${trend.date},${trend.revenue}\n`;
  });

  csvContent += "\n\nPayment Methods Report\n";
  csvContent += "Method,Amount\n";
  analytics.paymentMethods.forEach(method => {
    csvContent += `${method.method},${method.amount}\n`;
  });

  csvContent += "\n\nCurrent Inventory Report\n";
  csvContent += "Product,Current Stock,Reorder Level,Status\n";
  analytics.currentInventory.forEach(item => {
    const status = item.currentStock <= 0 ? 'Out of Stock' :
      item.currentStock <= (item.product.reorderLevel || 5) ? 'Low Stock' : 'In Stock';
    csvContent += `"${item.product.title}",${item.currentStock},${item.product.reorderLevel || 5},${status}\n`;
  });

  csvContent += "\n\nTop Customers Report\n";
  csvContent += "Customer,Total Spent,Purchase Count,Last Purchase\n";
  analytics.customerPurchaseHistory?.forEach(customer => {
    csvContent += `"${customer.name}",${customer.totalSpent},${customer.purchaseCount},${customer.lastPurchase}\n`;
  });

  csvContent += "\n\nTop Suppliers Report\n";
  csvContent += "Supplier,Total Amount\n";
  analytics.topSuppliers.forEach(supplier => {
    csvContent += `"${supplier.name}",${supplier.total}\n`;
  });

  csvContent += "\n\nTop Products Report\n";
  csvContent += "Product,Revenue\n";
  analytics.topProducts.forEach(product => {
    csvContent += `"${product.name}",${product.revenue}\n`;
  });

  return csvContent;
}

// Export analytics data to JSON format
export function exportAnalyticsToJSON(analytics: ReturnType<typeof useBusinessAnalytics>, period: string) {
  return {
    period,
    timestamp: new Date().toISOString(),
    financial: {
      totalRevenue: analytics.totalRevenue,
      totalCosts: analytics.totalCosts,
      netProfit: analytics.netProfit,
      accountsReceivable: analytics.accountsReceivable,
      accountsPayable: analytics.accountsPayable,
    },
    sales: {
      trends: analytics.salesTrends,
      paymentMethods: analytics.paymentMethods,
    },
    inventory: {
      current: analytics.currentInventory,
      lowStock: analytics.lowStockItems,
      outOfStock: analytics.outOfStockItems,
    },
    customers: analytics.customerPurchaseHistory,
    performance: {
      topSuppliers: analytics.topSuppliers,
      topProducts: analytics.topProducts,
    }
  };
}

// Generate HTML for printing
export function generatePrintHTML(analytics: ReturnType<typeof useBusinessAnalytics>, period: string, businessName: string) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Business Reports - ${businessName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .financial-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .financial-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
        .financial-card .value { font-size: 1.5em; font-weight: bold; }
        .financial-card .label { color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Business Reports</h1>
        <h2>${businessName}</h2>
        <p>Period: ${period}</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>Financial Summary</h2>
        <div class="financial-summary">
          <div class="financial-card">
            <div class="value">${formatCurrency(analytics.totalRevenue)}</div>
            <div class="label">Total Revenue</div>
          </div>
          <div class="financial-card">
            <div class="value">${formatCurrency(analytics.totalCosts)}</div>
            <div class="label">Total Costs</div>
          </div>
          <div class="financial-card">
            <div class="value" style="${analytics.netProfit >= 0 ? 'color: green;' : 'color: red;'}">${formatCurrency(analytics.netProfit)}</div>
            <div class="label">Net Profit</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Sales Trends</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Revenue</th></tr>
          </thead>
          <tbody>
  `;

  analytics.salesTrends.forEach(trend => {
    htmlContent += `<tr><td>${trend.date}</td><td>${formatCurrency(trend.revenue)}</td></tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Payment Methods</h2>
        <table>
          <thead>
            <tr><th>Method</th><th>Amount</th></tr>
          </thead>
          <tbody>
  `;

  analytics.paymentMethods.forEach(method => {
    htmlContent += `<tr><td>${method.method}</td><td>${formatCurrency(method.amount)}</td></tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Current Inventory</h2>
        <table>
          <thead>
            <tr><th>Product</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th></tr>
          </thead>
          <tbody>
  `;

  analytics.currentInventory.forEach(item => {
    const status = item.currentStock <= 0 ? 'Out of Stock' :
      item.currentStock <= (item.product.reorderLevel || 5) ? 'Low Stock' : 'In Stock';
    htmlContent += `<tr>
      <td>${item.product.title}</td>
      <td>${item.currentStock}</td>
      <td>${item.product.reorderLevel || 5}</td>
      <td>${status}</td>
    </tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Top Customers</h2>
        <table>
          <thead>
            <tr><th>Customer</th><th>Total Spent</th><th>Purchase Count</th><th>Last Purchase</th></tr>
          </thead>
          <tbody>
  `;

  analytics.customerPurchaseHistory.forEach(customer => {
    htmlContent += `<tr>
      <td>${customer.name}</td>
      <td>${formatCurrency(customer.totalSpent)}</td>
      <td>${customer.purchaseCount}</td>
      <td>${formatDate(customer.lastPurchase)}</td>
    </tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Top Suppliers</h2>
        <table>
          <thead>
            <tr><th>Supplier</th><th>Total Amount</th></tr>
          </thead>
          <tbody>
  `;

  analytics.topSuppliers.forEach(supplier => {
    htmlContent += `<tr><td>${supplier.name}</td><td>${formatCurrency(supplier.total)}</td></tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Top Products</h2>
        <table>
          <thead>
            <tr><th>Product</th><th>Revenue</th></tr>
          </thead>
          <tbody>
  `;

  analytics.topProducts.forEach(product => {
    htmlContent += `<tr><td>${product.name}</td><td>${formatCurrency(product.revenue)}</td></tr>`;
  });

  htmlContent += `
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
}
