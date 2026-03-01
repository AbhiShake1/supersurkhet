import { useMemo } from 'react';
import { api } from '@/lib/api';
import NepaliDate from 'nepali-datetime';
import type { Sale, StockImport } from '@/lib/schemas/sales';
import { aggregateStockBookEntries } from '@/lib/stock-book-aggregation';
import {
  lineTotal,
  toFiniteNumber,
} from './business-analytics-number-utils';

const saleTotal = (sale: Sale) =>
  sale.items?.reduce((sum, i) => sum + lineTotal(i.quantity, i.unitPrice), 0) ??
  0;

const importTotal = (imp: StockImport) =>
  imp.items?.reduce((sum, i) => sum + lineTotal(i.quantity, i.unitPrice), 0) ??
  0;

export function useBusinessAnalytics(slug: string, period: string = 'all') {
  const { data: sales = [] } = api.sale.useGet({ keys: [slug] });
  const { data: stockImports = [] } = api.stockImport.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: stockBook = [] } = api.stockBook.useGet({ keys: [slug] });

  const productsBySoul = useMemo(
    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
    () => new Map(products.map((p) => [p._?.soul!, p])),
    [products],
  );
  const partiesBySoul = useMemo(
    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
    () => new Map(parties.map((p) => [p._?.soul!, p])),
    [parties],
  );

  // Filter data by time period
  const filteredSales = filterByPeriod(sales, period);
  const filteredStockImports = filterByPeriod(stockImports, period);

  // Financial Overview
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + saleTotal(sale), 0),
    [filteredSales],
  );

  const totalCosts = useMemo(
    () => filteredStockImports.reduce((sum, imp) => sum + importTotal(imp), 0),
    [filteredStockImports],
  );

  const netProfit = useMemo(
    () => totalRevenue - totalCosts,
    [totalRevenue, totalCosts],
  );

  // Accounts Receivable/Payable
  const accountsReceivable = useMemo(
    () =>
      filteredSales.reduce((sum, sale) => {
        const total = saleTotal(sale);
        const due = total - toFiniteNumber(sale.paidAmount);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredSales],
  );

  const accountsPayable = useMemo(
    () =>
      filteredStockImports.reduce((sum, imp) => {
        const total = importTotal(imp);
        const due = total - toFiniteNumber(imp.paidAmount);
        return due > 0 ? sum + due : sum;
      }, 0),
    [filteredStockImports],
  );

  // Detailed breakdowns for Accounts Receivable
  const accountsReceivableBreakdown = useMemo(() => {
    return (
      filteredSales
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        .filter((sale: any) => {
          const total = saleTotal(sale);
          const due = total - toFiniteNumber(sale.paidAmount);
          return due > 0;
        })
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        .map((sale: any) => {
          const total = saleTotal(sale);
          const due = total - toFiniteNumber(sale.paidAmount);
          return {
            id: sale._?.soul || '',
            customer: sale.customerName || 'Walk-in Customer',
            totalAmount: total,
            paidAmount: toFiniteNumber(sale.paidAmount),
            dueAmount: due,
            date:
              sale.saleDate ||
              (sale.timestamp ? new Date(sale.timestamp).toISOString() : ''),
            items:
              // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
              sale.items?.map((item: any) => ({
                product:
                  productsBySoul.get(item.product)?.title || item.product,
                quantity: toFiniteNumber(item.quantity),
                unitPrice: toFiniteNumber(item.unitPrice),
                total: lineTotal(item.quantity, item.unitPrice),
              })) || [],
          };
        })
    );
  }, [filteredSales, productsBySoul]);

  // Detailed breakdowns for Accounts Payable
  const accountsPayableBreakdown = useMemo(() => {
    return filteredStockImports
      .filter((imp) => {
        const total = importTotal(imp);
        const due = total - toFiniteNumber(imp.paidAmount);
        return due > 0;
      })
      .map((imp) => {
        const total = importTotal(imp);
        const due = total - toFiniteNumber(imp.paidAmount);
        const party = partiesBySoul.get(imp.party);
        return {
          id: imp._?.soul || '',
          supplier: party?.name || imp.party,
          totalAmount: total,
          paidAmount: toFiniteNumber(imp.paidAmount),
          dueAmount: due,
          date:
            imp.importDate ||
            (imp.timestamp ? new Date(imp.timestamp).toISOString() : ''),
          items:
            imp.items?.map((item) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title || item.product,
              quantity: toFiniteNumber(item.quantity),
              unitPrice: toFiniteNumber(item.unitPrice),
              total: lineTotal(item.quantity, item.unitPrice),
            })) || [],
        };
      });
  }, [filteredStockImports, partiesBySoul, productsBySoul]);

  // Top Suppliers
  const supplierTotals = useMemo(() => {
    const totals = filteredStockImports.reduce(
      (acc, imp) => {
        acc[imp.party] = (acc[imp.party] || 0) + importTotal(imp);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([partyId, total]) => {
        const party = partiesBySoul.get(partyId);
        return { name: party?.name || "Deleted Party", total };
      });
  }, [filteredStockImports, partiesBySoul.get]);

  // Top Products
  const productRevenue = useMemo(() => {
    const revenue = filteredSales.reduce(
      (acc, sale) => {
        sale.items?.forEach((item) => {
          acc[item.product] =
            (acc[item.product] || 0) + lineTotal(item.quantity, item.unitPrice);
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(revenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, revenue]) => {
        const product = productsBySoul.get(productId);
        return { name: product?.title || "Deleted Product", revenue };
      });
  }, [filteredSales, productsBySoul]);

  // Sales Trends - Group sales by date
  const salesTrends = useMemo(() => {
    const trends = filteredSales.reduce(
      (acc, sale) => {
        const date = new Date(sale.saleDate || sale.timestamp).toDateString();
        acc[date] = (acc[date] || 0) + saleTotal(sale);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(trends)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSales]);

  // Payment Methods Breakdown
  const paymentMethods = useMemo(() => {
    const methods = filteredSales.reduce(
      (acc, sale) => {
        const method = sale.paymentMethod || 'cash';
        acc[method] = (acc[method] || 0) + saleTotal(sale);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(methods).map(([method, amount]) => ({
      method,
      amount,
    }));
  }, [filteredSales]);

  // Current Inventory Levels
  const currentInventory = useMemo(() => {
    const inventory = new Map<string, { product: any; currentStock: number }>();
    const aggregate = aggregateStockBookEntries(stockBook);

    products.forEach((product) => {
      if (product._?.soul) {
        inventory.set(product._.soul, {
          product,
          currentStock: toFiniteNumber(
            aggregate.productTotalAvailable[product._.soul],
          ),
        });
      }
    });

    return Array.from(inventory.values());
  }, [products, stockBook]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return currentInventory
      .filter(
        (item) =>
          item.currentStock <= (item.product.reorderLevel || 5) &&
          item.currentStock > 0,
      )
      .slice(0, 10); // Top 10 low stock items
  }, [currentInventory]);

  // Out of Stock Items
  const outOfStockItems = useMemo(() => {
    return currentInventory
      .filter((item) => item.currentStock <= 0)
      .slice(0, 10); // Top 10 out of stock items
  }, [currentInventory]);

  // Customer Purchase History
  const customerPurchaseHistory = useMemo(() => {
    const customerSales = filteredSales.reduce(
      (acc, sale) => {
        const customerName = sale.customerName || 'Walk-in Customer';
        if (!acc[customerName]) {
          acc[customerName] = {
            name: customerName,
            totalSpent: 0,
            purchaseCount: 0,
            lastPurchase:
              sale.saleDate ||
              (!sale.timestamp ? '' : new Date(sale.timestamp).toISOString()),
          };
        }
        acc[customerName].totalSpent += saleTotal(sale);
        acc[customerName].purchaseCount += 1;
        if (
          sale.saleDate &&
          new Date(sale.saleDate) > new Date(acc[customerName].lastPurchase)
        ) {
          acc[customerName].lastPurchase = sale.saleDate;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          name: string;
          totalSpent: number;
          purchaseCount: number;
          lastPurchase: string;
        }
      >,
    );

    return Object.values(customerSales)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 customers
  }, [filteredSales]);

  // Revenue Breakdown - showing where revenue came from
  const revenueBreakdown = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    return filteredSales.map((sale: any) => {
      const total = saleTotal(sale);
      return {
        id: sale._?.soul || '',
        customer: sale.customerName || 'Walk-in Customer',
        totalAmount: total,
        paidAmount: toFiniteNumber(sale.paidAmount),
        dueAmount: total - toFiniteNumber(sale.paidAmount),
        date:
          sale.saleDate ||
          (sale.timestamp ? new Date(sale.timestamp).toISOString() : ''),
        items:
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          sale.items?.map((item: any) => ({
            product: productsBySoul.get(item.product)?.title || item.product,
            quantity: toFiniteNumber(item.quantity),
            unitPrice: toFiniteNumber(item.unitPrice),
            total: lineTotal(item.quantity, item.unitPrice),
          })) || [],
      };
    });
  }, [filteredSales, productsBySoul]);

  // Cost Breakdown - showing where costs came from based on product cost prices

  // Cost Breakdown - based on Stock Imports (SUPPLIERS)
  const costBreakdown = useMemo(() => {
    return filteredStockImports
      .map((imp) => {
        const party = partiesBySoul.get(imp.party);

        const items =
          imp.items?.map((item) => ({
            product: productsBySoul.get(item.product)?.title || item.product,
            quantity: toFiniteNumber(item.quantity),
            unitPrice: toFiniteNumber(item.unitPrice),
            total: lineTotal(item.quantity, item.unitPrice),
          })) || [];

        const totalAmount = items.reduce((s, i) => s + i.total, 0);

        return {
          id: imp._?.soul || '',
          supplier: party?.name || 'Unknown Supplier',
          totalAmount,
          date:
            imp.importDate ||
            (imp.timestamp ? new Date(imp.timestamp).toISOString() : ''),
          items,
        };
      })
      .filter((c) => c.totalAmount > 0);
  }, [filteredStockImports, partiesBySoul, productsBySoul]);
  return {
    totalRevenue,
    totalCosts,
    netProfit,
    accountsReceivable,
    accountsPayable,
    accountsReceivableBreakdown,
    accountsPayableBreakdown,
    revenueBreakdown,
    costBreakdown,
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

function filterByPeriod<
  T extends {
    saleDate?: string;
    importDate?: string;
    timestamp?: number;
    issuedAt?: string;
  },
>(data: T[], period: string): T[] {
  const now = new Date();
  let startDate = new Date(0);

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    }
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return data.filter((item) => {
    const dateField =
      item.issuedAt ||
      item.saleDate ||
      item.importDate ||
      (item.timestamp ? new Date(item.timestamp).toISOString() : null);
    return dateField ? new Date(dateField) >= startDate : true;
  });
}

export function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`;
}
