import type { SchemaKeys } from '@gta/react-hooks';
import {
  Car,
  DollarSign,
  MapIcon,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Users,
  Users2,
} from 'lucide-react';
import NepaliDate from 'nepali-datetime';
import z from 'zod';
import type { AutoTableTab } from '@/components/auto-admin';
import { AutoFormSubmit } from '@/components/ui/auto-form';
import {
  AutoForm,
  fieldConfig,
  withSourceCustomData,
} from '@/components/ui/autoform';
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
import { type SalesItem, salesItemSchema } from '@/lib/schemas/sales';
import { db } from '@/lib/ssr/api';
import { isNonNullable } from '@/lib/utils';
import {
  getItemsTotalForPaymentStatus,
  getPaymentStatusFromTotals,
} from './payment-status-derivation';
import { deriveUnitPrice } from './unit-price-derivation';


type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoTableTab<K>;
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

function getPaidAmountFromFormValues(formValues: {
  paidAmount?: number | null | string;
}) {
  return Number(formValues.paidAmount ?? 0);
}

function createDerivedPaymentStatusFieldFromFormValues(
  formValues: {
    items?: Array<{ quantity?: number | null; unitPrice?: number | null } | null> | null;
    paidAmount?: number | null;
  },
) {
  return z
    .string()
    .default('pending')
    .describe('Payment Status')
    .superRefine(
      fieldConfig({
        inputProps: {
          className: 'border-none',
          disabled: true,
        },
        customData: {
          derive: () => {
            const totalCost = getItemsTotalForPaymentStatus(formValues.items ?? []);
            const paidAmount = getPaidAmountFromFormValues(formValues);
            return {
              inputProps: {
                value: getPaymentStatusFromTotals({
                  paidAmount,
                  totalAmount: totalCost,
                }),
              }
            };
          },
        },
      }),
    );
}

function createSoftDerivedPaidAmountFieldFromFormValues(
  formValues: {
    items?: Array<{ quantity?: number | null; unitPrice?: number | null } | null> | null;
  },
) {
  return z
    .number({ coerce: true })
    .default(0)
    .describe('Paid Amount')
    .superRefine(
      fieldConfig({
        fieldType: 'number',
        customData: {
          derive: () => ({
            inputProps: {
              value: getItemsTotalForPaymentStatus(formValues.items ?? []),
            }
          }),
        },
      }),
    );
}

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
}

function getSoftDerivedUnitValue({
  formValues,
  rowPath,
  productUnit,
}: {
  formValues: unknown;
  rowPath: string[];
  productUnit?: string | null;
}) {
  const row = getValueAtPath(formValues, rowPath) as
    | { unit?: string | null }
    | undefined;
  const explicitUnitRaw = row?.unit;
  const explicitUnit =
    explicitUnitRaw === null || explicitUnitRaw === undefined || explicitUnitRaw === ''
      ? null
      : String(explicitUnitRaw);

  const [unitType, piecesPerUnit] = String(productUnit ?? '').split(':');
  const allowedUnits = [unitType, piecesPerUnit ? 'piece' : undefined].filter(
    isNonNullable,
  );
  if (explicitUnit && allowedUnits.includes(explicitUnit)) {
    return explicitUnit;
  }
  return String(productUnit ?? '');
}

function createSoftDerivedUnitField({
  slug,
  className = 'border-none',
}: {
  slug: string;
  className?: string;
}) {
  return z
    .string()
    .optional()
    .describe('Unit')
    .superRefine(
      fieldConfig({
        fieldType: 'unit',
        inputProps: {
          disabled: true,
          placeholder: 'Select product for unit',
          className,
        },
        customData: withSourceCustomData({
          slug,
          source: {
            table: 'product',
            key: 'product',
            displayKey: 'title',
          },
          derive: async ({ sourceRow, formValues, rowPath }) => {
            if (!sourceRow?.unit) return null;
            const [unitType, piecesPerUnit] = String(sourceRow.unit).split(':');
            const configDisabled = Boolean(piecesPerUnit);

            return {
              value: getSoftDerivedUnitValue({
                formValues,
                rowPath,
                productUnit: String(sourceRow.unit),
              }),
              customData: {
                onlyAllow: [
                  unitType,
                  piecesPerUnit ? 'piece' : undefined,
                ].filter(isNonNullable),
                configDisabled,
              },
            };
          },
        }),
      }),
    );
}

function createSoftDerivedUnitPriceField({
  slug,
  priceKey,
}: {
  slug: string;
  priceKey: 'sellingPrice' | 'costPrice';
}) {
  return z
    .number({ coerce: true })
    .describe('Unit Price')
    .superRefine(
      fieldConfig({
        fieldType: 'number',
        customData: withSourceCustomData({
          slug,
          source: {
            table: 'product',
            key: 'product',
            displayKey: 'title',
          },
          derive: async ({ sourceRow, formValues, rowPath }) => {
            if (!sourceRow) return null;
            const row = getValueAtPath(formValues, rowPath) as
              | { unit?: string | null; unitPrice?: number | string | null }
              | undefined;

            const basePrice = Number(
              (sourceRow as Record<string, unknown>)[priceKey] ?? 0,
            );
            const derivedUnitPrice = deriveUnitPrice({
              basePrice,
              productUnit: String(sourceRow.unit ?? ''),
              selectedUnit: String(row?.unit ?? sourceRow.unit ?? ''),
            });

            return {
              inputProps: {
                value: derivedUnitPrice,
              }
            };
          },
        }),
      }),
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
  const partiesBySoul = new Map(parties?.map((p) => [p._?.soul, p]));
  const vehiclesBySoul = new Map(vehicles?.map((v) => [v._?.soul, v]));
  const tripsBySoul = new Map(trips?.map((t) => [t._?.soul, t]));
  const customersBySoul = new Map(customers?.map((c) => [c._?.soul, c]));
  const productsBySoul = new Map(products?.map((p) => [p._?.soul, p]));
  const ordersBySoul = new Map(orders?.map((o) => [o._?.soul, o]));

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
                options: products.map((p) => [p, productsBySoul.get(p)?.title ?? "-"]),
              },
            }),
          ),
        unit: createSoftDerivedUnitField({ slug }),
        unitPrice: createSoftDerivedUnitPriceField({
          slug,
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .describe('Products Returned from Trip')
      .min(0);
  }

  const returnedProductsSchema = returnedProductsSchemaWithProducts(products?.map((p) => p._?.soul ?? "") ?? []);

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
        title: 'Products',
        slug,
        icon: ShoppingBag,
        group: 'Inventory',
      },
      {
        schema: 'party',
        title: 'Purchase Parties',
        slug,
        icon: Users2,
        group: 'Party',
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
        title: 'Customers',
        slug,
        icon: Users,
        group: 'Party',
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
        title: 'Stock Imports',
        icon: ShoppingBag,
        slug,
        group: 'Inventory',
        previewOverrides: {
          party: (p) => partiesBySoul.get(p)?.name ?? "-",
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
          schema
            .extend({
              items: salesItemSchema
                .extend({
                  unit: createSoftDerivedUnitField({ slug }),
                  unitPrice: createSoftDerivedUnitPriceField({
                    slug,
                    priceKey: 'costPrice',
                  }),
                })
                .array()
                .min(1, { message: 'Please add at least one item.' })
                .describe('Items to Import'),
            })
            .withDerivation('paidAmount', ({ formValues }) =>
              createSoftDerivedPaidAmountFieldFromFormValues(formValues),
            )
            .withDerivation('paymentStatus', ({ formValues }) =>
              createDerivedPaymentStatusFieldFromFormValues(formValues),
            )
            .superRefine((stockImport, ctx) => {
              if (!stockImport.paidAmount) return;
              const totalCost = getItemsTotalForPaymentStatus(stockImport.items);
              if (stockImport.paidAmount > totalCost)
                ctx.addIssue({
                  code: 'custom',
                  message: `Paid amount cannot be greater than total cost (${totalCost})`,
                  path: ['paidAmount'],
                });
            }),
        async onCreate(_, variables) {
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

          void db.invoice.create(slug)({
            type: 'purchase',
            partyId: variables.party,
            issuedAt: variables.importDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            paidAmount: variables.paidAmount || 0,
            // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
            paymentStatus: (variables.paymentStatus || 'pending') as any,
            fiscalYear: calculateFiscalYear(),
          });
        },
      },
      {
        schema: 'sale',
        title: 'Sales',
        icon: DollarSign,
        group: 'Inventory',
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
          schema
            .extend({
              items: salesItemSchema
                .extend({
                  unit: createSoftDerivedUnitField({ slug }),
                  unitPrice: createSoftDerivedUnitPriceField({
                    slug,
                    priceKey: 'sellingPrice',
                  }),
                })
                .array()
                .min(1, { message: 'Please add at least one item.' })
                .describe('Items Sold'),
            })
            .withDerivation('paidAmount', ({ formValues }) =>
              createSoftDerivedPaidAmountFieldFromFormValues(formValues),
            )
            .withDerivation('paymentStatus', ({ formValues }) =>
              createDerivedPaymentStatusFieldFromFormValues(formValues),
            )
            .superRefine((sale, ctx) => {
              if (!sale.paidAmount) return;
              const totalCost = getItemsTotalForPaymentStatus(sale.items);
              if (sale.paidAmount > totalCost)
                ctx.addIssue({
                  code: 'custom',
                  message: `Paid amount cannot be greater than total cost (${totalCost})`,
                  path: ['paidAmount'],
                });
            }),
        async onCreate(_, variables) {
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

          void db.invoice.create(slug)({
            type: 'sale',
            partyId: variables.customerId,
            issuedAt: variables.saleDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            paidAmount: variables.paidAmount || 0,
            // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
            paymentStatus: (variables.paymentStatus || 'pending') as any,
            fiscalYear: calculateFiscalYear(),
          });
        },
        onUpdate(_) {
          return;
        },
      },
      {
        schema: 'invoice',
        title: 'Invoices',
        group: 'Financial',
        slug,
        icon: Receipt,
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
        title: 'Orders',
        icon: ShoppingCart,
        group: 'Inventory',
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
          schema
            .extend({
              items: salesItemSchema
                .extend({
                  unit: createSoftDerivedUnitField({ slug }),
                  unitPrice: createSoftDerivedUnitPriceField({
                    slug,
                    priceKey: 'sellingPrice',
                  }),
                })
                .array()
                .min(1, { message: 'Please add at least one item.' })
                .describe('Items Ordered'),
            })
            .withDerivation('paidAmount', ({ formValues }) =>
              createSoftDerivedPaidAmountFieldFromFormValues(formValues),
            )
            .withDerivation('paymentStatus', ({ formValues }) =>
              createDerivedPaymentStatusFieldFromFormValues(formValues),
            )
            .superRefine((order, ctx) => {
              if (!order.paidAmount) return;
              const totalCost = getItemsTotalForPaymentStatus(order.items);
              if (order.paidAmount > totalCost)
                ctx.addIssue({
                  code: 'custom',
                  message: `Paid amount cannot be greater than total cost (${totalCost})`,
                  path: ['paidAmount'],
                });
            }),
        async onCreate(_, variables) {
          if (variables.orderStatus === 'done') {
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

            void db.invoice.create(slug)({
              type: 'sale',
              partyId: variables.customerId,
              issuedAt: new Date().toISOString(),
              items: invoiceItems,
              subTotal: totalAmount,
              tax: 0,
              paidAmount: variables.paidAmount || 0,
              // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
              paymentStatus: (variables.paymentStatus || 'pending') as any,
              fiscalYear: calculateFiscalYear(),
            });
          }
        },
        onUpdate(_, variables) {
          if (variables.orderStatus !== 'done') return;
          const currentOrder = ordersBySoul.get(variables.id);
          const order = { ...currentOrder, ...variables };
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

          const invoiceItems = order.items?.map((item) => {
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

          const totalAmount = order.items?.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0,
          ) ?? 0;

          db.invoice.create(slug)({
            type: 'sale',
            partyId: order.customerId,
            issuedAt: new Date().toISOString(),
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            paidAmount: order.paidAmount || 0,
            paymentStatus: order.paymentStatus || ('pending' as any),
            fiscalYear: calculateFiscalYear(),
          });
        },
      },
      {
        schema: 'vehicle',
        title: 'Vehicles',
        slug,
        icon: Car,
        group: 'Logistics',
      },
      {
        schema: 'trip',
        title: 'Trips',
        slug,
        icon: MapIcon,
        group: 'Logistics',
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
              product: item.product ?? '-',
              totalAmount:
                Number(item.quantity || 0) * Number(item.unitPrice || 0),
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema.extend({
            products: salesItemSchema
              .extend({
                unit: createSoftDerivedUnitField({ slug }),
                unitPrice: createSoftDerivedUnitPriceField({
                  slug,
                  priceKey: 'sellingPrice',
                }),
              })
              .array()
              .min(1, { message: 'Please add at least one product.' })
              .describe('Products Sent on Trip'),
            returnedProducts: returnedProductsSchema,
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
        onUpdate(_) {
          console.log(
            'Trip update functionality would handle stock adjustments here',
          );
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
                              const soldProducts = row.original.products
                                .map((dispatchedProduct) => {
                                  const returnedProduct =
                                    data.returnedProducts?.find(
                                      (rp) =>
                                        rp.product ===
                                        dispatchedProduct.product,
                                    );
                                  const returnedQty = returnedProduct
                                    ? returnedProduct.quantity
                                    : 0;
                                  const soldQty =
                                    dispatchedProduct.quantity - returnedQty;

                                  return {
                                    productId: dispatchedProduct.product,
                                    quantity: Math.max(0, soldQty),
                                  };
                                })
                                .filter((sp) => sp.quantity > 0);

                              void db.trip.update(slug)({
                                id: row.original._?.soul ?? '',
                                returnTime: new Date().toISOString(),
                                returnedProducts: data.returnedProducts,
                              });

                              for (const returnedProduct of data.returnedProducts ??
                                []) {
                                const products = await db.product.get({
                                  keys: [slug],
                                });
                                const product = products.find(
                                  (item) =>
                                    item?._?.soul === returnedProduct.product,
                                );
                                if (!product?._?.soul) return;

                                let adjustedQuantity = returnedProduct.quantity;

                                if (product.unit?.includes(':')) {
                                  const [unitType, piecesPerUnit] =
                                    product.unit.split(':');
                                  if (returnedProduct.unit === unitType) {
                                    adjustedQuantity =
                                      returnedProduct.quantity *
                                      parseInt(piecesPerUnit, 10);
                                  }
                                }

                                void db.product.update(slug)({
                                  id: product._.soul,
                                  stockQuantity:
                                    product.stockQuantity + adjustedQuantity,
                                });
                              }
                              if (soldProducts.length > 0) {
                                const products = await db.product.get({
                                  keys: [slug],
                                });
                                const productsBySoul = new Map(
                                  products
                                    .filter((item) => item?._?.soul)
                                    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
                                    .map((item) => [item._?.soul!, item]),
                                );
                                const invoiceItems = soldProducts.map(
                                  (item) => ({
                                    product: item.productId,
                                    quantity: item.quantity,
                                    rate:
                                      productsBySoul.get(item.productId)
                                        ?.sellingPrice || 0,
                                    total:
                                      item.quantity *
                                      (productsBySoul.get(item.productId)
                                        ?.sellingPrice || 0),
                                    vehicleId: row.original.vehicleId,
                                  }),
                                );

                                const totalAmount = soldProducts.reduce(
                                  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                                  (sum: number, item: any) =>
                                    sum +
                                    item.quantity *
                                    (productsBySoul.get(item.productId)
                                      ?.sellingPrice || 0),
                                  0,
                                );

                                const vehicles = await db.vehicle.get({
                                  keys: [slug],
                                });
                                const vehicle = vehicles.find(
                                  (item) =>
                                    item?._?.soul === row.original.vehicleId,
                                );

                                void db.invoice.create(slug)({
                                  type: 'sale',
                                  partyId: 'trip-sale',
                                  issuedAt: new Date().toISOString(),
                                  items: invoiceItems,
                                  subTotal: totalAmount,
                                  tax: 0,
                                  paidAmount: totalAmount,
                                  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                                  paymentStatus: 'paid' as any,
                                  fiscalYear: calculateFiscalYear(),
                                  vehicleId: row.original.vehicleId,
                                  tripId: row.original._?.soul,
                                  description: `Sale from trip ${row.original._?.soul} by ${vehicle?.name || 'vehicle'}`,
                                });

                                soldProducts.forEach((soldProduct) => {
                                  const product = productsBySoul.get(
                                    soldProduct.productId,
                                  );
                                  if (product?._?.soul) {
                                    void db.product.update(slug)({
                                      id: product._.soul,
                                      stockQuantity:
                                        product.stockQuantity -
                                        soldProduct.quantity,
                                    });
                                  }
                                });
                              }

                              const closeBtn = document.querySelector(
                                '[data-state="open"] [data-dismiss]',
                              );
                              if (closeBtn) (closeBtn as HTMLElement).click();
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
