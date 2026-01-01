import { useMemo } from "react";
import { api } from "@/lib/api";
import NepaliDate from "nepali-datetime";
import type { Sale, StockImport } from "@/lib/schemas/sales";

const saleTotal = (sale: Sale) =>
  sale.items?.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) ?? 0

const importTotal = (imp: StockImport) =>
  imp.items?.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) ?? 0

export function useBusinessAnalytics(slug: string, period: string = 'all') {
  const { data: sales = [] } = api.sale.useGet({ keys: [slug] });
  const { data: stockImports = [] } = api.stockImport.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: invoices = [] } = api.invoice.useGet({ keys: [slug] });

  const productsBySoul = useMemo(() => new Map(products.map(p => [p._!.soul!, p])), [products]);
  const partiesBySoul = useMemo(() => new Map(parties.map(p => [p._!.soul!, p])), [parties]);

  // Filter data by time period
  const filteredSales = filterByPeriod(sales, period);
  const filteredStockImports = filterByPeriod(stockImports, period);
  const filteredInvoices = filterByPeriod(invoices, period);

  // Financial Overview
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0),
    [filteredSales]
  );

  const totalCosts = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum +
          (sale.items?.reduce(
            (s, item) => s + (productsBySoul.get(item.product)?.costPrice || 0) * item.quantity,
            0
          ) ?? 0),
        0
      ),
    [filteredSales]
  );

  const netProfit = useMemo(
    () => totalRevenue - totalCosts,
    [totalRevenue, totalCosts]
  );

  // Accounts Receivable/Payable
  const accountsReceivable = useMemo(
    () =>
      filteredSales.reduce((sum, sale) => {
        const total = saleTotal(sale);
        const due = total - (sale.paidAmount ?? 0);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredSales]
  );

  const accountsPayable = useMemo(
    () =>
      filteredStockImports.reduce((sum, imp) => {
        const total = importTotal(imp);
        const due = total - (imp.paidAmount ?? 0);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredStockImports]
  );

  // Top Suppliers
  const supplierTotals = useMemo(() => {
    const totals = filteredStockImports.reduce((acc, imp) => {
      acc[imp.party] = (acc[imp.party] || 0) + importTotal(imp);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([partyId, total]) => {
        const party = partiesBySoul.get(partyId);
        return { name: party?.name || partyId, total };
      });
  }, [filteredStockImports, parties]);

  // Top Products
  const productRevenue = useMemo(() => {
    const revenue = filteredSales.reduce((acc, sale) => {
      sale.items?.forEach(item => {
        acc[item.product] = (acc[item.product] || 0) + (item.quantity * item.unitPrice);
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, revenue]) => {
        const product = products.find(p => p._?.soul === productId);
        return { name: product?.title || productId, revenue };
      });
  }, [filteredSales, products]);

  // Sales Trends - Group sales by date
  const salesTrends = useMemo(() => {
    const trends = filteredSales.reduce((acc, sale) => {
      const date = new Date(sale.saleDate || sale.timestamp).toDateString();
      acc[date] = (acc[date] || 0) + saleTotal(sale);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(trends)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSales]);

  // Payment Methods Breakdown
  const paymentMethods = useMemo(() => {
    const methods = filteredSales.reduce((acc, sale) => {
      const method = sale.paymentMethod || 'cash';
      acc[method] = (acc[method] || 0) + saleTotal(sale);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(methods).map(([method, amount]) => ({
      method,
      amount
    }));
  }, [filteredSales]);

  // Current Inventory Levels
  const currentInventory = useMemo(() => {
    // Start with initial stock from products
    const inventory = new Map<string, { product: any, currentStock: number }>();

    // Initialize with product stock quantities
    products.forEach(product => {
      if (product._?.soul) {
        inventory.set(product._.soul, {
          product,
          currentStock: product.stockQuantity || 0
        });
      }
    });

    // Subtract sales
    // filteredSales.forEach(sale => {
    //   sale.items?.forEach(item => {
    //     if (inventory.has(item.product)) {
    //       const current = inventory.get(item.product)!;
    //       inventory.set(item.product, {
    //         ...current,
    //         currentStock: current.currentStock - item.quantity
    //       });
    //     }
    //   });
    // });

    // Add stock imports
    // filteredStockImports.forEach(imp => {
    //   imp.items?.forEach(item => {
    //     if (inventory.has(item.product)) {
    //       const current = inventory.get(item.product)!;
    //       inventory.set(item.product, {
    //         ...current,
    //         currentStock: current.currentStock + item.quantity
    //       });
    //     }
    //   });
    // });

    return Array.from(inventory.values());
  }, [products, filteredSales, filteredStockImports]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return currentInventory
      .filter(item =>
        item.currentStock <= (item.product.reorderLevel || 5) &&
        item.currentStock > 0
      )
      .slice(0, 10); // Top 10 low stock items
  }, [currentInventory]);

  // Out of Stock Items
  const outOfStockItems = useMemo(() => {
    return currentInventory
      .filter(item => item.currentStock <= 0)
      .slice(0, 10); // Top 10 out of stock items
  }, [currentInventory]);

  // Customer Purchase History
  const customerPurchaseHistory = useMemo(() => {
    const customerSales = filteredSales.reduce((acc, sale) => {
      const customerName = sale.customerName || 'Walk-in Customer';
      if (!acc[customerName]) {
        acc[customerName] = {
          name: customerName,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: sale.saleDate || (!sale.timestamp ? "" : new Date(sale.timestamp).toISOString())
        };
      }
      acc[customerName].totalSpent += saleTotal(sale);
      acc[customerName].purchaseCount += 1;
      if (sale.saleDate && new Date(sale.saleDate) > new Date(acc[customerName].lastPurchase)) {
        acc[customerName].lastPurchase = sale.saleDate;
      }
      return acc;
    }, {} as Record<string, { name: string, totalSpent: number, purchaseCount: number, lastPurchase: string }>);

    return Object.values(customerSales)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 customers
  }, [filteredSales]);

  return {
    totalRevenue,
    totalCosts,
    netProfit,
    accountsReceivable,
    accountsPayable,
    topSuppliers: supplierTotals,
    topProducts: productRevenue,
    salesTrends,
    paymentMethods,
    currentInventory,
    lowStockItems,
    outOfStockItems,
    customerPurchaseHistory,
  } as const;
}

function filterByPeriod<T extends { saleDate?: string; importDate?: string; timestamp?: number; issuedAt?: string }>(
  data: T[],
  period: string
): T[] {
  const now = new Date();
  let startDate = new Date(0);

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return data.filter(item => {
    const dateField = item.issuedAt || item.saleDate || item.importDate || (item.timestamp ? new Date(item.timestamp).toISOString() : null);
    return dateField ? new Date(dateField) >= startDate : true;
  });
}

export function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`;
}
