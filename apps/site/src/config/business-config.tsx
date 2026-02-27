import type { SchemaKeys } from '@gta/react-hooks';
import NepaliDate from 'nepali-datetime';
import z from 'zod';
import type { AutoAdminTabInput, UpdateContext } from '@/components/auto-admin';
import { AutoFormSubmit } from '@/components/ui/auto-form';
import { AutoForm, fieldConfig } from '@/components/ui/autoform';
import { Button } from '@/components/ui/button';
import {
  Credenza,
  CredenzaContent,
  CredenzaTrigger,
} from '@/components/ui/credenza';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ReceiptWrapper } from '@/components/ui/receipt-wrapper';
import { useDialog } from '@/contexts/dialog-context';
import { api } from '@/lib/api';
import type { BusinessType } from '@/lib/schema';
import { type SalesItem, salesItemSchema } from '@/lib/schemas/retail';
import { db } from '@/lib/ssr/api';
import { getPaymentStatusFromTotals } from './payment-status-derivation';

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoAdminTabInput;
}[SchemaKeys];

export type BusinessConfigReturn = {
  [B in BusinessType]?: AnyAutoTableTab[];
};

function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year
    .toString()
    .slice(2)}/${(year + 1).toString().slice(2)}`;
}

type PaymentInput = {
  paidAt?: string | null;
  paidAmount?: number | string | null;
  paymentMethod?: string | null;
  bankVoucherNumber?: string | null;
} | null;

function normalizePaymentsWithFallback(
  payments: PaymentInput[] | undefined,
  fallbackPaidAmount: number | undefined,
) {
  if (Array.isArray(payments) && payments.length) {
    return payments.map((payment) => ({
      paidAt: payment?.paidAt || new Date().toISOString(),
      paidAmount: Number(payment?.paidAmount ?? 0),
      paymentMethod: payment?.paymentMethod || undefined,
      bankVoucherNumber: payment?.bankVoucherNumber?.trim() || undefined,
    }));
  }

  const paidAmount = Number(fallbackPaidAmount ?? 0);
  if (!paidAmount) return [];
  return [{ paidAt: new Date().toISOString(), paidAmount }];
}

function getPaidAmountFromPayments(payments: PaymentInput[] | undefined) {
  if (!Array.isArray(payments) || !payments.length) return 0;
  return payments.reduce((sum, payment) => {
    const paidAmount = Number(payment?.paidAmount ?? 0);
    return Number.isFinite(paidAmount) ? sum + paidAmount : sum;
  }, 0);
}

type ProductStockRecord = {
  _?: { soul?: string };
  unit?: string | null;
  stockQuantity?: number | null;
};

type StockEntryItem = Pick<SalesItem, 'product' | 'quantity' | 'unit'>;

function getAdjustedQuantity(
  item: StockEntryItem,
  productInfo: ProductStockRecord | undefined,
) {
  let adjustedQuantity = Number(item.quantity ?? 0);
  if (!productInfo?.unit?.includes(':')) return adjustedQuantity;

  const [unitType, piecesPerUnit] = productInfo.unit.split(':');
  const parsedPiecesPerUnit = parseInt(piecesPerUnit, 10);
  if (!Number.isFinite(parsedPiecesPerUnit) || item.unit !== unitType) {
    return adjustedQuantity;
  }

  adjustedQuantity = adjustedQuantity * parsedPiecesPerUnit;
  return adjustedQuantity;
}

function getItemsByProductIdWithQuantity(
  items: StockEntryItem[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items?.reduce(
      (acc, item) => {
        const productInfo = productsBySoul.get(item.product);
        if (!productInfo) return acc;

        const adjustedQuantity = getAdjustedQuantity(item, productInfo);
        acc[item.product] = (acc[item.product] || 0) + adjustedQuantity;
        return acc;
      },
      {} as Record<string, number>,
    ) ?? {}
  );
}

function buildInvoiceItems(
  items: SalesItem[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items?.map((item) => ({
      product: item.product,
      quantity: getAdjustedQuantity(item, productsBySoul.get(item.product)),
      rate: item.unitPrice,
      total: item.quantity * item.unitPrice,
    })) ?? []
  );
}

function getTotalAmount(items: SalesItem[] | undefined) {
  return (
    items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0
  );
}

export function useBusinessConfig({
  slug,
}: {
  slug: string;
}): BusinessConfigReturn {
  const { openDialog, closeDialog } = useDialog();
  const { data: parties } = api.party.useGet({ keys: [slug] });
  const { data: vehicles } = api.vehicle.useGet({ keys: [slug] });
  const { data: trips } = api.trip.useGet({ keys: [slug] });
  const { data: products } = api.product.useGet({ keys: [slug] });
  const { data: customers } = api.customer.useGet({ keys: [slug] });
  const { data: orders } = api.order.useGet({ keys: [slug] });
  const { data: stockImports } = api.stockImport.useGet({ keys: [slug] });
  const { data: sales } = api.sale.useGet({ keys: [slug] });
  const partiesBySoul = new Map(parties?.map((p) => [p._?.soul, p]));
  const vehiclesBySoul = new Map(vehicles?.map((v) => [v._?.soul, v]));
  const tripsBySoul = new Map(trips?.map((t) => [t._?.soul, t]));
  const customersBySoul = new Map(customers?.map((c) => [c._?.soul, c]));
  const productsBySoul = new Map(products?.map((p) => [p._?.soul, p]));
  const ordersBySoul = new Map(orders?.map((o) => [o._?.soul, o]));
  const stockImportsBySoul = new Map(stockImports?.map((s) => [s._?.soul, s]));
  const salesBySoul = new Map(sales?.map((s) => [s._?.soul, s]));

  function returnedProductsSchemaWithProducts(products: string[]) {
    return salesItemSchema
      .extend({
        product: z
          .string()
          .describe('Product')
          .superRefine(
            fieldConfig({
              fieldType: 'select',
              customData: {
                options: products.map((p) => [
                  p,
                  productsBySoul.get(p)?.title ?? '-',
                ]),
              },
            }),
          ),
      })
      .array()
      .optional()
      .describe('Products Returned from Trip');
  }

  const returnedProductsSchema = returnedProductsSchemaWithProducts(
    products?.map((p) => p._?.soul ?? '') ?? [],
  );

  async function deleteInvoiceByPartyId(id: string) {
    const invoices = await db.invoice.get({ keys: [slug] });
    const stockImports = await db.stockImport.get({ keys: [slug] });
    for (const stockImport of stockImports) {
      if (stockImport.party === id && !!stockImport._?.soul) {
        void db.stockImport.remove(slug)(stockImport._.soul);
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        void db.invoice.remove(slug)(invoice._.soul);
      }
    }
    closeDialog();
  }

  async function deleteInvoiceByCustomerId(id: string) {
    const invoices = await db.invoice.get({ keys: [slug] });
    const sales = await db.sale.get({ keys: [slug] });
    for (const sale of sales) {
      if (sale.customerId === id && !!sale._?.soul) {
        void db.sale.remove(slug)(sale._.soul);
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        void db.invoice.remove(slug)(invoice._.soul);
      }
    }
    closeDialog();
  }

  return {
    retail: [
      {
        schema: 'product',
        slug,
      },
      {
        schema: 'party',
        slug,
        async onDelete(_, id) {
          const invoices = await db.invoice.get({ keys: [slug] });
          if (!invoices.length) return;
          if (!invoices.some((invoice) => invoice.partyId === id)) return;
          openDialog({
            title: 'Delete Invoices',
            description:
              'The party has been deleted. Do you want to delete all associated invoices?',
            children: (
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => closeDialog()}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteInvoiceByPartyId(id)}
                >
                  Delete
                </Button>
              </div>
            ),
          });
        },
      },
      {
        schema: 'customer',
        slug,
        async onDelete(_, id) {
          const invoices = await db.invoice.get({ keys: [slug] });
          if (!invoices.length) return;
          if (!invoices.some((invoice) => invoice.partyId === id)) return;
          openDialog({
            title: 'Delete Invoices',
            description:
              'The customer has been deleted. Do you want to delete all associated invoices?',
            children: (
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => closeDialog()}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteInvoiceByCustomerId(id)}
                >
                  Delete
                </Button>
              </div>
            ),
          });
        },
      },
      {
        schema: 'stockImport',
        slug,
        previewOverrides: {
          party: (p) => partiesBySoul.get(p)?.name ?? '-',
          items: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        async onCreate(data, variables) {
          const products = await db.product.get({ keys: [slug] });
          const productsBySoul = new Map(
            products
              .filter((item) => item?._?.soul)
              .map((item) => [item._?.soul, item]),
          );
          const itemsByProductIdWithQuantity = variables.items?.reduce(
            (a, { product, quantity, unit }) => {
              const productInfo = productsBySoul.get(product);
              if (!productInfo) return a;

              let adjustedQuantity = quantity;
              if (productInfo.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');

                if (unit === unitType) {
                  adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
                }
              }

              a[product] = (a[product] || 0) + adjustedQuantity;
              return a;
            },
            {} as Record<string, number>,
          );

          Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
            ([productId, quantity]) => {
              const product = productsBySoul.get(productId);
              if (!product?._?.soul) return;
              void db.product.update(slug)({
                id: product?._?.soul,
                stockQuantity: product?.stockQuantity + quantity,
              });
            },
          );

          const invoiceItems =
            variables.items?.map((item) => {
              const productInfo = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;

              if (productInfo?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');

                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }

              return {
                product: item.product,
                quantity: adjustedQuantity,
                rate: item.unitPrice,
                total: item.quantity * item.unitPrice,
              };
            }) ?? [];

          const totalAmount =
            variables.items?.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            ) ?? 0;
          const payments = normalizePaymentsWithFallback(
            variables.payments,
            variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          void db.invoice.create(slug)({
            id: data.id,
            type: 'purchase',
            partyId: variables.party,
            issuedAt: variables.importDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });
        },
        onUpdate(_, variables, updateContext) {
          const stockImport = stockImportsBySoul.get(variables.id);
          const currentStockImport =
            (updateContext as UpdateContext<'stockImport'>)?.newData ??
            stockImport;
          const previousStockImport =
            (updateContext as UpdateContext<'stockImport'>)?.previousData ??
            stockImport;
          const previousItemsByProduct = getItemsByProductIdWithQuantity(
            previousStockImport?.items,
            productsBySoul as Map<string, ProductStockRecord>,
          );
          const updatedItemsByProduct = getItemsByProductIdWithQuantity(
            currentStockImport?.items ?? variables.items,
            productsBySoul as Map<string, ProductStockRecord>,
          );
          const affectedProductIds = new Set([
            ...Object.keys(previousItemsByProduct),
            ...Object.keys(updatedItemsByProduct),
          ]);

          affectedProductIds.forEach((productId) => {
            const previousQuantity = previousItemsByProduct[productId] || 0;
            const updatedQuantity = updatedItemsByProduct[productId] || 0;
            const delta = updatedQuantity - previousQuantity;
            if (!delta) return;

            const product = productsBySoul.get(productId);
            if (!product?._?.soul) return;
            void db.product.update(slug)({
              id: product._.soul,
              stockQuantity: Number(product.stockQuantity || 0) + delta,
            });
          });

          const items = currentStockImport?.items ?? variables.items;
          const totalAmount = getTotalAmount(items);
          const payments = normalizePaymentsWithFallback(
            currentStockImport?.payments ?? variables.payments,
            currentStockImport?.paidAmount ?? variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          db.invoice.update(slug)({
            id: variables.id,
            partyId: currentStockImport?.party ?? variables.party,
            issuedAt: currentStockImport?.importDate ?? variables.importDate,
            items: buildInvoiceItems(
              items,
              productsBySoul as Map<string, ProductStockRecord>,
            ),
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
          });
        },
      },
      {
        schema: 'sale',
        slug,
        previewOverrides: {
          customerId: (id) =>
            customersBySoul.get(id)?.name ||
            customersBySoul.get(id)?.phone ||
            '-',
          saleDate: (date) =>
            date
              ? new Date(date).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-',
          items: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema.superRefine((data, ctx) => {
            if (!data?.items) return;

            // Sum quantities per product
            const totalsByProduct = new Map<string, number>();

            data.items.forEach((item) => {
              const productId = item?.product;
              if (!productId) return;

              const qty = Number(item?.quantity ?? 0);
              if (!Number.isFinite(qty) || qty <= 0) return;

              totalsByProduct.set(
                productId,
                (totalsByProduct.get(productId) ?? 0) + qty,
              );
            });

            // Validate against stock
            for (const [productId, total] of totalsByProduct) {
              const product = productsBySoul.get(productId);
              const available = Number(product?.stockQuantity ?? 0);

              if (total > available) {
                // Put the error on each row that uses that product
                data.items.forEach((item, index) => {
                  if (item?.product !== productId) return;

                  ctx.addIssue({
                    code: 'custom',
                    message: `${product?.title ?? 'This product'} has ${available} in stock. You tried to order ${total}.`,
                    path: ['items', index, 'quantity'],
                  });
                });
              }
            }
          }),
        async onCreate(data, variables) {
          const itemsByProductIdWithQuantity = variables.items?.reduce(
            (a, { product, quantity, unit }) => {
              const productInfo = productsBySoul.get(product);
              if (!productInfo) return a;

              let adjustedQuantity = quantity;
              if (productInfo.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');

                if (unit === unitType) {
                  adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
                }
              }

              a[product] = (a[product] || 0) + adjustedQuantity;
              return a;
            },
            {} as Record<string, number>,
          );

          Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
            ([productId, quantity]) => {
              const product = productsBySoul.get(productId);
              if (!product?._?.soul) return;
              void db.product.update(slug)({
                id: product._.soul,
                stockQuantity: product.stockQuantity - quantity,
              });
            },
          );

          const invoiceItems =
            variables.items?.map((item) => {
              const productInfo = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;

              if (productInfo?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');

                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }

              return {
                product: item.product,
                quantity: adjustedQuantity,
                rate: item.unitPrice,
                total: item.quantity * item.unitPrice,
              };
            }) ?? [];

          const totalAmount =
            variables.items?.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            ) ?? 0;
          const payments = normalizePaymentsWithFallback(
            variables.payments,
            variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          void db.invoice.create(slug)({
            id: data.id,
            type: 'sale',
            partyId: variables.customerId,
            issuedAt: variables.saleDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });
        },
        onUpdate(_, variables, updateContext) {
          const sale = salesBySoul.get(variables.id);
          const currentSale =
            (updateContext as UpdateContext<'sale'>)?.newData ?? sale;
          const previousSale =
            (updateContext as UpdateContext<'sale'>)?.previousData ?? sale;
          const previousItemsByProduct = getItemsByProductIdWithQuantity(
            previousSale?.items,
            productsBySoul as Map<string, ProductStockRecord>,
          );
          const updatedItemsByProduct = getItemsByProductIdWithQuantity(
            currentSale?.items ?? variables.items,
            productsBySoul as Map<string, ProductStockRecord>,
          );
          const affectedProductIds = new Set([
            ...Object.keys(previousItemsByProduct),
            ...Object.keys(updatedItemsByProduct),
          ]);

          affectedProductIds.forEach((productId) => {
            const previousQuantity = previousItemsByProduct[productId] || 0;
            const updatedQuantity = updatedItemsByProduct[productId] || 0;
            const delta = updatedQuantity - previousQuantity;
            if (!delta) return;

            const product = productsBySoul.get(productId);
            if (!product?._?.soul) return;
            void db.product.update(slug)({
              id: product._.soul,
              stockQuantity: Number(product.stockQuantity || 0) - delta,
            });
          });

          const items = currentSale?.items ?? variables.items;
          const totalAmount = getTotalAmount(items);
          const payments = normalizePaymentsWithFallback(
            currentSale?.payments ?? variables.payments,
            currentSale?.paidAmount ?? variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          db.invoice.update(slug)({
            id: variables.id,
            partyId: currentSale?.customerId ?? variables.customerId,
            issuedAt: currentSale?.saleDate ?? variables.saleDate,
            items: buildInvoiceItems(
              items,
              productsBySoul as Map<string, ProductStockRecord>,
            ),
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
          });
        },
      },
      {
        schema: 'invoice',
        slug,
        readOnly: true,
        actions: async ({ row }) => {
          const partyId = row.original.partyId;
          if (!partyId) return null;
          const party = partiesBySoul.get(partyId);
          if (!party) return null;
          return (
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Credenza>
                <CredenzaTrigger>View Receipt</CredenzaTrigger>
                <CredenzaContent>
                  <ReceiptWrapper
                    invoice={row.original}
                    party={party}
                    productsById={new Map()}
                  />
                </CredenzaContent>
              </Credenza>
            </DropdownMenuItem>
          );
        },
        previewOverrides: {
          partyId: (id) =>
            partiesBySoul.get(id)?.name || customersBySoul.get(id)?.name || '-',
          vehicleId: (id) => vehiclesBySoul.get(id)?.name || '-',
          tripId: (id) => {
            const trip = tripsBySoul.get(id);
            if (!trip) return '-';
            return [
              trip.destination,
              [trip.dispatchTime, trip.returnTime].filter(Boolean).join(' - '),
            ].join(' | ');
          },
          issuedAt: (date) =>
            date
              ? new Date(date).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-',
          dueDate: (date) =>
            date
              ? new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '-',
          items: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
      },
      {
        schema: 'order',
        slug,
        previewOverrides: {
          customerId: (id) =>
            customersBySoul.get(id)?.name ||
            customersBySoul.get(id)?.phone ||
            '-',
          items: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema.superRefine((data, ctx) => {
            if (!data?.items) return;

            // Sum quantities per product
            const totalsByProduct = new Map<string, number>();

            data.items.forEach((item) => {
              const productId = item?.product;
              if (!productId) return;

              const qty = Number(item?.quantity ?? 0);
              if (!Number.isFinite(qty) || qty <= 0) return;

              totalsByProduct.set(
                productId,
                (totalsByProduct.get(productId) ?? 0) + qty,
              );
            });

            // Validate against stock
            for (const [productId, total] of totalsByProduct) {
              const product = productsBySoul.get(productId);
              const available = Number(product?.stockQuantity ?? 0);

              if (total > available) {
                // Put the error on each row that uses that product
                data.items.forEach((item, index) => {
                  if (item?.product !== productId) return;

                  ctx.addIssue({
                    code: 'custom',
                    message: `${product?.title ?? 'This product'} has ${available} in stock. You tried to order ${total}.`,
                    path: ['items', index, 'quantity'],
                  });
                });
              }
            }
          }),
        async onCreate(_, variables) {
          if (variables.orderStatus !== 'done') return;
          const itemsByProductIdWithQuantity = variables.items?.reduce(
            (a, item) => {
              const product = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;
              if (product?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = product.unit.split(':');
                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }
              a[item.product] = (a[item.product] || 0) + adjustedQuantity;
              return a;
            },
            {} as Record<string, number>,
          );

          Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
            ([productId, quantity]) => {
              const product = productsBySoul.get(productId);
              if (!product?._?.soul) return;
              db.product.update(slug)({
                id: product._.soul,
                stockQuantity: product.stockQuantity - quantity,
              });
            },
          );

          const invoiceItems =
            variables.items?.map((item) => {
              const productInfo = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;

              if (productInfo?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');
                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }

              return {
                product: item.product,
                quantity: adjustedQuantity,
                rate: item.unitPrice,
                total: item.quantity * item.unitPrice,
              };
            }) ?? [];

          const totalAmount =
            variables.items?.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            ) ?? 0;
          const payments = normalizePaymentsWithFallback(
            variables.payments,
            variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          void db.invoice.create(slug)({
            type: 'sale',
            partyId: variables.customerId,
            issuedAt: new Date().toISOString(),
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });
        },
        onUpdate(_, variables, updateContext) {
          if (variables.orderStatus !== 'done') return;
          const currentOrder =
            (updateContext as UpdateContext<'order'>)?.previousData ??
            ordersBySoul.get(variables.id);
          if (currentOrder?.orderStatus === 'done') return;
          const order =
            (updateContext as UpdateContext<'order'>)?.newData ??
            ordersBySoul.get(variables.id);
          if (!order?.items?.length || !order?.customerId) return;

          const itemsByProductIdWithQuantity = order.items?.reduce(
            (a, item) => {
              const product = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;
              if (product?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = product.unit.split(':');
                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }
              a[item.product] = (a[item.product] || 0) + adjustedQuantity;
              return a;
            },
            {} as Record<string, number>,
          );

          Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
            ([productId, quantity]) => {
              const product = productsBySoul.get(productId);
              if (!product?._?.soul) return;
              db.product.update(slug)({
                id: product._.soul,
                stockQuantity: product.stockQuantity - quantity,
              });
            },
          );

          const invoiceItems =
            order.items?.map((item) => {
              const productInfo = productsBySoul.get(item.product);
              let adjustedQuantity = item.quantity;

              if (productInfo?.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');
                if (item.unit === unitType) {
                  adjustedQuantity =
                    item.quantity * parseInt(piecesPerUnit, 10);
                }
              }

              return {
                product: item.product,
                quantity: adjustedQuantity,
                rate: item.unitPrice,
                total: item.quantity * item.unitPrice,
              };
            }) ?? [];

          const totalAmount =
            order.items?.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0,
            ) ?? 0;
          const payments = normalizePaymentsWithFallback(
            order.payments,
            order.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          db.invoice.create(slug)({
            type: 'sale',
            partyId: order.customerId,
            issuedAt: new Date().toISOString(),
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });
        },
      },
      {
        schema: 'vehicle',
        slug,
      },
      {
        schema: 'trip',
        slug,
        previewOverrides: {
          vehicleId: (vehicleId) => vehiclesBySoul.get(vehicleId)?.name ?? '-',
          products: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
              totalAmount:
                Number(item.quantity || 0) * Number(item.unitPrice || 0),
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
          returnedProducts: (items) => {
            const mapped = items?.map((item: SalesItem) => ({
              ...item,
              product: productsBySoul.get(item.product)?.title ?? '-',
              totalAmount:
                Number(item.quantity || 0) * Number(item.unitPrice || 0),
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema
            .extend({
              returnedProducts: returnedProductsSchema,
            })
            .superRefine((data, ctx) => {
              if (!data?.products) return;

              // Sum quantities per product
              const totalsByProduct = new Map<string, number>();

              data.products.forEach((item) => {
                const productId = item?.product;
                if (!productId) return;

                const qty = Number(item?.quantity ?? 0);
                if (!Number.isFinite(qty) || qty <= 0) return;

                totalsByProduct.set(
                  productId,
                  (totalsByProduct.get(productId) ?? 0) + qty,
                );
              });

              // Validate against stock
              for (const [productId, total] of totalsByProduct) {
                const product = productsBySoul.get(productId);
                const available = Number(product?.stockQuantity ?? 0);

                if (total > available) {
                  // Put the error on each row that uses that product
                  data.products.forEach((item, index) => {
                    if (item?.product !== productId) return;

                    ctx.addIssue({
                      code: 'custom',
                      message: `${product?.title ?? 'This product'} has ${available} in stock. You tried to order ${total}.`,
                      path: ['items', index, 'quantity'],
                    });
                  });
                }
              }
            }),
        async onCreate(_, variables) {
          const products = await db.product.get({ keys: [slug] });
          const productsBySoul = new Map(
            products
              .filter((item) => item?._?.soul)
              .map((item) => [item._?.soul, item]),
          );

          const itemsByProductIdWithQuantity = variables.products?.reduce(
            (a, { product, quantity, unit }) => {
              const productInfo = productsBySoul.get(product);
              if (!productInfo) return a;

              let adjustedQuantity = quantity;
              if (productInfo.unit?.includes(':')) {
                const [unitType, piecesPerUnit] = productInfo.unit.split(':');

                if (unit === unitType) {
                  adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
                }
              }

              a[product] = (a[product] || 0) + adjustedQuantity;
              return a;
            },
            {} as Record<string, number>,
          );

          Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
            ([productId, quantity]) => {
              const product = productsBySoul.get(productId);
              if (!product?._?.soul) return;
              void db.product.update(slug)({
                id: product._.soul,
                stockQuantity: product.stockQuantity - quantity,
              });
            },
          );
        },
        async onUpdate(_, variables, updateContext) {
          const currentTrip =
            (updateContext as UpdateContext<'trip'>)?.previousData ??
            tripsBySoul.get(variables.id);
          if (currentTrip?.returnTime) return;

          const trip =
            (updateContext as UpdateContext<'trip'>)?.newData ??
            tripsBySoul.get(variables.id);
          if (!trip?.returnTime || !trip?.products?.length) return;

          const soldProducts = trip.products
            .map((dispatchedProduct) => {
              const returnedProduct = trip.returnedProducts?.find(
                (rp) => rp.product === dispatchedProduct.product,
              );
              const returnedQty = returnedProduct
                ? returnedProduct.quantity
                : 0;
              const soldQty = dispatchedProduct.quantity - returnedQty;

              return {
                productId: dispatchedProduct.product,
                quantity: Math.max(0, soldQty),
              };
            })
            .filter((sp) => sp.quantity > 0);

          const products = await db.product.get({ keys: [slug] });
          const productsBySoul = new Map(
            products
              .filter((item) => item?._?.soul)
              // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
              .map((item) => [item._?.soul!, item]),
          );

          for (const returnedProduct of trip.returnedProducts ?? []) {
            const product = productsBySoul.get(returnedProduct.product);
            if (!product?._?.soul) continue;

            let adjustedQuantity = returnedProduct.quantity;

            if (product.unit?.includes(':')) {
              const [unitType, piecesPerUnit] = product.unit.split(':');
              if (returnedProduct.unit === unitType) {
                adjustedQuantity =
                  returnedProduct.quantity * parseInt(piecesPerUnit, 10);
              }
            }

            void db.product.update(slug)({
              id: product._.soul,
              stockQuantity: product.stockQuantity + adjustedQuantity,
            });
          }

          if (!soldProducts.length) return;

          const invoiceItems = soldProducts.map((item) => ({
            product: item.productId,
            quantity: item.quantity,
            rate: productsBySoul.get(item.productId)?.sellingPrice || 0,
            total:
              item.quantity *
              (productsBySoul.get(item.productId)?.sellingPrice || 0),
            vehicleId: trip.vehicleId,
          }));

          const totalAmount = soldProducts.reduce(
            (sum, item) =>
              sum +
              item.quantity *
                (productsBySoul.get(item.productId)?.sellingPrice || 0),
            0,
          );

          const vehicles = await db.vehicle.get({ keys: [slug] });
          const vehicle = vehicles.find(
            (item) => item?._?.soul === trip.vehicleId,
          );

          void db.invoice.create(slug)({
            type: 'sale',
            partyId: 'trip-sale',
            issuedAt: new Date().toISOString(),
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            payments: [
              {
                paidAt: new Date().toISOString(),
                paidAmount: totalAmount,
              },
            ],
            paidAmount: totalAmount,
            paymentStatus: 'paid',
            fiscalYear: calculateFiscalYear(),
            vehicleId: trip.vehicleId,
            tripId: trip._?.soul,
            description: `Sale from trip ${trip._?.soul} by ${vehicle?.name || 'vehicle'}`,
          });

          soldProducts.forEach((soldProduct) => {
            const product = productsBySoul.get(soldProduct.productId);
            if (product?._?.soul) {
              void db.product.update(slug)({
                id: product._.soul,
                stockQuantity: product.stockQuantity - soldProduct.quantity,
              });
            }
          });
        },
        actions: async ({ row }) => {
          if (row.original.returnTime) return null;

          return (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    openDialog({
                      title: 'Mark Return for Trip',
                      className: 'max-h-[80vh] overflow-y-auto',
                      children: (
                        <div className="p-6">
                          <div className="mb-6">
                            <h4 className="font-medium mb-2">
                              Products Dispatched:
                            </h4>
                            <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                              <div>Product</div>
                              <div className="text-center">Sent</div>
                              <div className="text-center">Returned</div>
                            </div>
                            {row.original.products?.map((product) => {
                              return (
                                <div
                                  key={product._?.soul ?? ''}
                                  className="grid grid-cols-3 gap-2 text-sm"
                                >
                                  <div>
                                    {productsBySoul.get(product.product)
                                      ?.title || 'Unknown Product'}
                                  </div>
                                  <div className="text-center">
                                    {product.quantity}
                                  </div>
                                  <div className="text-center">0</div>
                                </div>
                              );
                            })}
                          </div>

                          <AutoForm
                            values={{
                              returnedProducts: (
                                row.original.products ?? []
                              ).map((p) => ({
                                ...p,
                                totalAmount:
                                  (p.quantity ?? 0) * (p.unitPrice ?? 0),
                              })),
                            }}
                            schema={z.object({
                              returnedProducts:
                                returnedProductsSchemaWithProducts(
                                  row.original.products?.map(
                                    (p) => p.product,
                                  ) ?? [],
                                ),
                            })}
                            onSubmit={async (data) => {
                              void db.trip.update(slug)({
                                id: row.original._?.soul ?? '',
                                returnTime: new Date().toISOString(),
                                returnedProducts: data.returnedProducts,
                              });

                              // const closeBtn = document.querySelector(
                              //   '[data-state="open"] [data-dismiss]',
                              // );
                              // if (closeBtn) (closeBtn as HTMLElement).click();
                              closeDialog();
                            }}
                          >
                            <AutoFormSubmit className="w-full">
                              Mark Return
                            </AutoFormSubmit>
                          </AutoForm>
                        </div>
                      ),
                    })
                  }
                >
                  Mark Return
                </button>
              </DropdownMenuItem>
            </>
          );
        },
      },
    ],
  };
}
