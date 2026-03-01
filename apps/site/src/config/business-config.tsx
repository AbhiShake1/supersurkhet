import type { SchemaKeys } from '@gta/react-hooks';
import z from 'zod';
import type { AutoAdminTabInput, UpdateContext } from '@/components/auto-admin';
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
import { calculateFiscalYear } from '@/lib/nepali-fiscal';
import type { BusinessType } from '@/lib/schema';
import { type SalesItem, salesItemSchema } from '@/lib/schemas/retail';
import { db } from '@/lib/ssr/api';
import {
  aggregateStockBookEntries,
  getProductPartyAvailability,
  UNASSIGNED_STOCK_BUCKET,
} from '@/lib/stock-book-aggregation';
import { getSoulFromUnknown } from '@/lib/utils';
import { getPaymentStatusFromTotals } from './payment-status-derivation';
import { deriveUnitPrice } from './unit-price-derivation';

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoAdminTabInput;
}[SchemaKeys];

export type BusinessConfigReturn = {
  [B in BusinessType]?: AnyAutoTableTab[];
};

type PaymentInput = {
  paidAt?: string | null;
  paidAmount?: number | string | null;
  paymentMethod?:
  | 'cash'
  | 'card'
  | 'bankTransfer'
  | 'credit'
  | 'online'
  | 'check'
  | null;
  bankVoucherNumber?: string | null;
} | null;

const validPaymentMethods = new Set([
  'cash',
  'card',
  'bankTransfer',
  'credit',
  'online',
  'check',
] as const);

function normalizePaymentsWithFallback(
  payments: PaymentInput[] | undefined,
  fallbackPaidAmount: number | undefined,
) {
  if (Array.isArray(payments) && payments.length) {
    return payments.map((payment) => ({
      paidAt: payment?.paidAt || new Date().toISOString(),
      paidAmount: Number(payment?.paidAmount ?? 0),
      paymentMethod:
        payment?.paymentMethod && validPaymentMethods.has(payment.paymentMethod)
          ? payment.paymentMethod
          : undefined,
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
  title?: string | null;
  unit?: string | null;
  sellingPrice?: number | null;
  partyId?: string | null;
  purchasePartyId?: string | null;
};

type StockEntryItem = {
  product?: string | null;
  productId?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  purchasePartyId?: string | null;
};

type SalesItemRuntime = Partial<SalesItem> & {
  productId?: string | null;
};

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

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
}

function resolveSalesItemProductId(item: SalesItemRuntime | null | undefined) {
  const product = item?.product;
  if (typeof product === 'string' && product) return product;
  const productId = item?.productId;
  if (typeof productId === 'string' && productId) return productId;
  return '';
}

function getProductLinkedPartyId(
  productInfo: ProductStockRecord | null | undefined,
) {
  return String(productInfo?.partyId ?? productInfo?.purchasePartyId ?? '');
}

function resolveItemPurchasePartyId(
  item: SalesItemRuntime | null | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  const explicitPartyId = String(item?.purchasePartyId ?? '');
  if (explicitPartyId) return explicitPartyId;
  const productId = resolveSalesItemProductId(item);
  if (!productId) return '';
  return getProductLinkedPartyId(productsBySoul.get(productId));
}

function getItemsByProductAndPartyQuantity(
  items: StockEntryItem[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items?.reduce(
      (acc, item) => {
        const productId = resolveSalesItemProductId(item);
        if (!productId) return acc;
        const productInfo = productsBySoul.get(productId);
        if (!productInfo) return acc;
        const partyId = resolveItemPurchasePartyId(item, productsBySoul);
        if (!partyId) return acc;
        const adjustedQuantity = getAdjustedQuantity(item, productInfo);
        const key = `${productId}::${partyId}`;
        acc[key] = (acc[key] || 0) + adjustedQuantity;
        return acc;
      },
      {} as Record<string, number>,
    ) ?? {}
  );
}

function createSoftDerivedSellingUnitPriceField() {
  return z
    .number({ coerce: true })
    .describe('Unit Price')
    .superRefine(
      fieldConfig({
        fieldType: 'number',
        customData: withSourceCustomData({
          source: {
            table: 'product',
            key: 'product',
            displayKey: 'title',
          },
          derive: async ({ sourceRow, formValues, rowPath }) => {
            if (!sourceRow) return null;
            const row = getValueAtPath(formValues, rowPath) as
              | { unit?: string | null }
              | undefined;
            const sourceRowValue = sourceRow as Record<string, unknown>;
            const basePrice = Number(sourceRowValue.sellingPrice ?? 0);
            const productUnit = String(sourceRowValue.unit ?? '');
            const selectedUnit = String(row?.unit ?? sourceRowValue.unit ?? '');
            const derivedUnitPrice = deriveUnitPrice({
              basePrice,
              productUnit,
              selectedUnit,
            });
            return {
              inputProps: {
                value: derivedUnitPrice,
              },
            };
          },
        }),
      }),
    );
}

function buildInvoiceItems(
  items: SalesItem[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items
      ?.map((item) => {
        const productId = resolveSalesItemProductId(item);
        if (!productId) return null;
        return {
          product: productId,
          quantity: getAdjustedQuantity(item, productsBySoul.get(productId)),
          rate: item.unitPrice,
          total: item.quantity * item.unitPrice,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? []
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
  const { data: stockBook = [] } = api.stockBook.useGet({ keys: [slug] });
  const partiesBySoul = new Map(parties?.map((p) => [p._?.soul, p]));
  const vehiclesBySoul = new Map(vehicles?.map((v) => [v._?.soul, v]));
  const tripsBySoul = new Map(trips?.map((t) => [t._?.soul, t]));
  const customersBySoul = new Map(customers?.map((c) => [c._?.soul, c]));
  const productsBySoul = new Map(products?.map((p) => [p._?.soul, p]));
  const ordersBySoul = new Map(orders?.map((o) => [o._?.soul, o]));
  const stockImportsBySoul = new Map(stockImports?.map((s) => [s._?.soul, s]));
  const salesBySoul = new Map(sales?.map((s) => [s._?.soul, s]));
  const stockAggregate = aggregateStockBookEntries(stockBook);

  function getPartyDisplayName(partyId: string) {
    if (partyId === UNASSIGNED_STOCK_BUCKET) return 'Unassigned';
    return partiesBySoul.get(partyId)?.name || partyId;
  }

  function getProductStockLabel(
    productId: string,
    { includeParty = false }: { includeParty?: boolean } = {},
  ) {
    const product = productsBySoul.get(productId);
    const available = Number(
      stockAggregate.productTotalAvailable[productId] || 0,
    );
    const productPartyId = getProductLinkedPartyId(product);
    if (includeParty) {
      return `${product?.title ?? '-'} | ${productPartyId ? getPartyDisplayName(productPartyId) : '-'
        } | Available: ${available}`;
    }

    return `${product?.title ?? '-'} - Available: ${available}`;
  }

  function buildOutflowItemSchema({
    includeProductPartyInLabel = false,
  }: {
    includeProductPartyInLabel?: boolean;
  } = {}) {
    const purchasePartyField = z
      .string()
      .optional()
      .describe('Purchase Party')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          inputProps: {
            hidden: true,
            type: 'hidden',
          },
          customData: {
            derive: ({ formValues, rowPath }) => {
              const row = rowPath.reduce<unknown>((acc, key) => {
                if (!acc || typeof acc !== 'object') return undefined;
                return (acc as Record<string, unknown>)[key];
              }, formValues);
              const productId =
                row && typeof row === 'object' && 'product' in row
                  ? String((row as { product?: string }).product || '')
                  : '';
              if (!productId) return null;
              const product = productsBySoul.get(productId);
              const derivedPartyId = getProductLinkedPartyId(product);
              if (!derivedPartyId) return null;
              return {
                value: derivedPartyId,
              };
            },
          },
        }),
      );

    const schemaWithComputedProduct = salesItemSchema.extend({
      product: z
        .string()
        .describe('Product')
        .superRefine(
          fieldConfig({
            fieldType: 'select',
            customData: {
              options: (products ?? [])
                .filter((product) => Boolean(product._?.soul))
                .map((product) => {
                  const productId = product._?.soul ?? '';
                  return [
                    productId,
                    getProductStockLabel(productId, {
                      includeParty: includeProductPartyInLabel,
                    }),
                  ];
                }),
              onValueChange: (value, path, form) => {
                const product = productsBySoul.get(value);
                if (!product) return;
                const rowPath = path.slice(0, -1);
                const unitPath = [...rowPath, 'unit'].join('.');
                const unitPricePath = [...rowPath, 'unitPrice'].join('.');
                const purchasePartyPath = [...rowPath, 'purchasePartyId'].join('.');

                const currentUnitRaw = form.getValues(unitPath);
                const productUnit = String(product.unit ?? '');
                const [packedUnit, piecesPerUnit] = productUnit.split(':');
                const currentUnit = String(currentUnitRaw ?? '');
                const allowedUnits = [
                  packedUnit,
                  piecesPerUnit ? 'piece' : undefined,
                ].filter((unit): unit is string => Boolean(unit));

                const nextUnit = allowedUnits.includes(currentUnit)
                  ? currentUnit
                  : productUnit;

                if (nextUnit && nextUnit !== currentUnit) {
                  form.setValue(unitPath, nextUnit, {
                    shouldDirty: false,
                    shouldTouch: false,
                    shouldValidate: false,
                  });
                }

                const derivedUnitPrice = deriveUnitPrice({
                  basePrice: Number(product.sellingPrice ?? 0),
                  productUnit,
                  selectedUnit: nextUnit || productUnit,
                });

                form.setValue(unitPricePath, derivedUnitPrice, {
                  shouldDirty: false,
                  shouldTouch: false,
                  shouldValidate: false,
                });

                const derivedPartyId = getProductLinkedPartyId(
                  product as ProductStockRecord,
                );
                if (derivedPartyId) {
                  form.setValue(purchasePartyPath, derivedPartyId, {
                    shouldDirty: false,
                    shouldTouch: false,
                    shouldValidate: false,
                  });
                }
              },
            },
          }),
        ),
      unitPrice: createSoftDerivedSellingUnitPriceField(),
    });

    return schemaWithComputedProduct.extend({
      purchasePartyId: purchasePartyField,
    });
  }

  function toSourceCode(sourceId: string | undefined) {
    if (!sourceId) return undefined;
    return sourceId.split('/').at(-1) || sourceId;
  }

  function getMutationId(data: unknown) {
    const soul = getSoulFromUnknown(data);
    if (soul) return soul;
    if (data && typeof data === 'object' && 'id' in data) {
      const id = (data as { id?: unknown }).id;
      return typeof id === 'string' ? id : undefined;
    }
    return undefined;
  }

  async function clearStockBookEntriesBySource(
    sourceTable:
      | 'product'
      | 'stockImport'
      | 'sale'
      | 'order'
      | 'trip'
      | 'manual'
      | 'fiscalClose',
    sourceId: string | undefined,
  ) {
    if (!sourceId) return;
    const entries = await db.stockBook.get({ keys: [slug] });
    for (const entry of entries) {
      if (!entry._?.soul) continue;
      if (entry.sourceTable !== sourceTable) continue;
      if (entry.sourceId !== sourceId) continue;
      await db.stockBook.remove(slug)(entry._.soul);
    }
  }

  async function createStockBookEntriesFromItems({
    sourceTable,
    sourceId,
    transactionType,
    movementType,
    direction,
    entryDate,
    items,
    counterpartyId,
    particularsPrefix,
    fiscalYear,
    requireOriginPartyId = false,
  }: {
    sourceTable:
    | 'product'
    | 'stockImport'
    | 'sale'
    | 'order'
    | 'trip'
    | 'manual'
    | 'fiscalClose';
    sourceId?: string;
    transactionType: 'purchase' | 'sale' | 'stock';
    movementType:
    | 'opening'
    | 'closing'
    | 'purchase'
    | 'sale'
    | 'order'
    | 'tripDispatch'
    | 'tripReturn'
    | 'adjustment';
    direction: 'in' | 'out';
    entryDate?: string;
    items: SalesItem[] | undefined;
    counterpartyId?: string;
    particularsPrefix: string;
    fiscalYear?: string;
    requireOriginPartyId?: boolean;
  }) {
    if (!items?.length) return;
    const products = await db.product.get({ keys: [slug] });
    const productsMap = new Map(
      products
        .filter((item) => item?._?.soul)
        .map((item) => [item._?.soul, item]),
    );

    const aggregates = items.reduce(
      (acc, item) => {
        const productId = resolveSalesItemProductId(item);
        if (!productId) return acc;
        const productInfo = productsMap.get(productId);
        if (!productInfo?._?.soul) return acc;
        const originPartyId = resolveItemPurchasePartyId(item, productsMap) || undefined;
        if (requireOriginPartyId && !originPartyId) {
          throw new Error(
            'Missing purchase party allocation for stock out line.',
          );
        }
        const adjustedQuantity = getAdjustedQuantity(item, productInfo);
        const lineAmount =
          Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const key = `${productId}::${originPartyId || ''}`;
        const existing = acc.get(key) || {
          productId,
          originPartyId,
          quantity: 0,
          totalAmount: 0,
          unitRate: 0,
        };
        existing.quantity += adjustedQuantity;
        existing.totalAmount += lineAmount;
        existing.unitRate = Number(item.unitPrice || existing.unitRate || 0);
        acc.set(key, existing);
        return acc;
      },
      new Map<
        string,
        {
          productId: string;
          originPartyId?: string;
          quantity: number;
          totalAmount: number;
          unitRate: number;
        }
      >(),
    );

    const eventDate = entryDate || new Date().toISOString();
    const sourceCode = toSourceCode(sourceId);
    const inferredFiscalYear = fiscalYear || calculateFiscalYear();

    for (const aggregate of aggregates.values()) {
      const quantity = Number(aggregate.quantity || 0);
      if (!quantity) continue;
      await db.stockBook.create(slug)({
        entryDate: eventDate,
        transactionType,
        movementType,
        direction,
        productId: aggregate.productId,
        quantityIn: direction === 'in' ? quantity : 0,
        quantityOut: direction === 'out' ? quantity : 0,
        quantity,
        unitRate: Number(aggregate.unitRate || 0),
        totalAmount: Number(aggregate.totalAmount || 0),
        particulars: sourceCode
          ? `${particularsPrefix} #${sourceCode}`
          : particularsPrefix,
        sourceTable,
        sourceId,
        sourceCode,
        counterpartyId,
        originPartyId: aggregate.originPartyId,
        fiscalYear: inferredFiscalYear,
      });
    }
  }

  function returnedProductsSchemaWithProducts(dispatchedItems: SalesItem[]) {
    const dispatchedByBucket = getItemsByProductAndPartyQuantity(
      dispatchedItems,
      productsBySoul as Map<string, ProductStockRecord>,
    );
    const dispatchedProductIds = Array.from(
      new Set(
        Object.keys(dispatchedByBucket)
          .map((key) => key.split('::')[0])
          .filter(Boolean),
      ),
    );

    return salesItemSchema
      .extend({
        product: z
          .string()
          .describe('Product')
          .superRefine(
            fieldConfig({
              fieldType: 'select',
              customData: {
                options: dispatchedProductIds.map((p) => [
                  p,
                  productsBySoul.get(p)?.title ?? '-',
                ]),
              },
            }),
          ),
        purchasePartyId: z
          .string()
          .optional()
          .describe('Purchase Party')
          .superRefine(
            fieldConfig({
              fieldType: 'select',
              inputProps: {
                hidden: true,
                type: 'hidden',
              },
              customData: {
                derive: ({ formValues, rowPath }) => {
                  const row = rowPath.reduce<unknown>((acc, key) => {
                    if (!acc || typeof acc !== 'object') return undefined;
                    return (acc as Record<string, unknown>)[key];
                  }, formValues);
                  const selectedProductId =
                    row && typeof row === 'object' && 'product' in row
                      ? String((row as { product?: string }).product || '')
                      : '';
                  if (!selectedProductId) return null;
                  const derivedPartyId = getProductLinkedPartyId(
                    productsBySoul.get(selectedProductId),
                  );
                  if (!derivedPartyId) return null;
                  return {
                    value: derivedPartyId,
                  };
                },
              },
            }),
          ),
      })
      .array()
      .optional()
      .superRefine((items, ctx) => {
        if (!items?.length) return;

        const returnedByBucket = new Map<string, number>();
        const indexesByBucket = new Map<string, number[]>();

        items.forEach((item, index) => {
          const productId = resolveSalesItemProductId(item);
          if (!productId) return;
          const partyId = resolveItemPurchasePartyId(item, productsBySoul);
          if (!partyId) return;
          const adjustedQuantity = getAdjustedQuantity(
            item,
            productsBySoul.get(productId),
          );
          const key = `${productId}::${partyId}`;
          returnedByBucket.set(
            key,
            (returnedByBucket.get(key) || 0) + adjustedQuantity,
          );
          indexesByBucket.set(key, [
            ...(indexesByBucket.get(key) || []),
            index,
          ]);
        });

        for (const [bucketKey, returnedQty] of returnedByBucket.entries()) {
          const dispatchedQty = Number(dispatchedByBucket[bucketKey] || 0);
          if (returnedQty <= dispatchedQty) continue;

          const [productId, partyId] = bucketKey.split('::');
          const productTitle =
            productsBySoul.get(productId)?.title ?? 'This product';
          const partyName =
            partyId === UNASSIGNED_STOCK_BUCKET
              ? 'Unassigned'
              : partiesBySoul.get(partyId)?.name || 'selected party';
          const message =
            dispatchedQty > 0
              ? `${productTitle} can return at most ${dispatchedQty} for ${partyName}. You entered ${returnedQty}.`
              : `${productTitle} was not dispatched for ${partyName}.`;
          const indexes = indexesByBucket.get(bucketKey) || [];

          for (const index of indexes) {
            ctx.addIssue({
              code: 'custom',
              message,
              path: [index, 'quantity'],
            });
          }
        }
      })
      .describe('Products Returned from Trip');
  }

  function buildTripReturnedItemSchema() {
    return salesItemSchema.extend({
      product: z
        .string()
        .describe('Product')
        .superRefine(
          fieldConfig({
            fieldType: 'select',
            customData: {
              derive: ({ formValues }) => {
                const dispatchedItems = Array.isArray(
                  (formValues as { products?: unknown[] })?.products,
                )
                  ? ((formValues as { products?: SalesItem[] }).products ?? [])
                  : [];
                const productIds = Array.from(
                  new Set(
                    dispatchedItems
                      .map((item) => resolveSalesItemProductId(item))
                      .filter((productId): productId is string =>
                        Boolean(productId),
                      ),
                  ),
                );
                return {
                  customData: {
                    options: productIds.map((productId) => [
                      productId,
                      productsBySoul.get(productId)?.title ?? '-',
                    ]),
                  },
                };
              },
            },
          }),
        ),
      purchasePartyId: z
        .string()
        .optional()
        .describe('Purchase Party')
        .superRefine(
          fieldConfig({
            fieldType: 'select',
            inputProps: {
              hidden: true,
              type: 'hidden',
            },
            customData: {
              derive: ({ formValues, rowPath }) => {
                const row = rowPath.reduce<unknown>((acc, key) => {
                  if (!acc || typeof acc !== 'object') return undefined;
                  return (acc as Record<string, unknown>)[key];
                }, formValues);
                const selectedProductId =
                  row && typeof row === 'object' && 'product' in row
                    ? String((row as { product?: string }).product || '')
                    : '';
                if (!selectedProductId) return null;
                const matchingPartyId = getProductLinkedPartyId(
                  productsBySoul.get(selectedProductId),
                );
                return {
                  value: matchingPartyId || '',
                };
              },
            },
          }),
        ),
      unitPrice: z.number({ coerce: true }).positive().describe('Unit Price'),
    });
  }

  function stockAggregateExcludingSource(
    sourceTable: 'sale' | 'order' | 'trip',
    sourceId: string | undefined,
  ) {
    if (!sourceId) return stockAggregate;
    return aggregateStockBookEntries(
      stockBook.filter(
        (entry) =>
          !(entry.sourceTable === sourceTable && entry.sourceId === sourceId),
      ),
    );
  }

  function validateOutflowItemsByParty({
    items,
    ctx,
    fieldPath,
    aggregate,
  }: {
    items: SalesItem[] | undefined;
    ctx: z.RefinementCtx;
    fieldPath: string;
    aggregate: ReturnType<typeof aggregateStockBookEntries>;
  }) {
    if (!items?.length) return;
    const totalsByBucket = new Map<string, number>();
    const indexesByBucket = new Map<string, number[]>();

    items.forEach((item, index) => {
      const productId = resolveSalesItemProductId(item);
      if (!productId) return;
      const partyId = resolveItemPurchasePartyId(item, productsBySoul);
      if (!partyId) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selected product must be associated with a party.',
          path: [fieldPath, index, 'product'],
        });
        return;
      }
      const adjustedQuantity = getAdjustedQuantity(
        item,
        productsBySoul.get(productId),
      );
      const key = `${productId}::${partyId}`;
      totalsByBucket.set(
        key,
        (totalsByBucket.get(key) || 0) + adjustedQuantity,
      );
      indexesByBucket.set(key, [...(indexesByBucket.get(key) || []), index]);
    });

    for (const [bucketKey, quantity] of totalsByBucket.entries()) {
      const [productId, partyId] = bucketKey.split('::');
      const available = getProductPartyAvailability(
        aggregate,
        productId,
        partyId,
      );
      if (quantity <= available) continue;
      const productTitle =
        productsBySoul.get(productId)?.title ?? 'This product';
      const partyName =
        partyId === UNASSIGNED_STOCK_BUCKET
          ? 'Unassigned'
          : (partiesBySoul.get(partyId)?.name ?? 'selected party');
      const indexes = indexesByBucket.get(bucketKey) || [];
      for (const index of indexes) {
        ctx.addIssue({
          code: 'custom',
          message: `${productTitle} has ${available} available for ${partyName}. You requested ${quantity}.`,
          path: [fieldPath, index, 'quantity'],
        });
      }
    }
  }

  function validateReturnedItemsByDispatchedBuckets({
    dispatchedItems,
    returnedItems,
    ctx,
    fieldPath,
  }: {
    dispatchedItems: SalesItem[] | undefined;
    returnedItems: SalesItem[] | undefined;
    ctx: z.RefinementCtx;
    fieldPath: string;
  }) {
    if (!returnedItems?.length) return;

    const dispatchedByBucket = getItemsByProductAndPartyQuantity(
      dispatchedItems,
      productsBySoul as Map<string, ProductStockRecord>,
    );
    const returnedByBucket = new Map<string, number>();
    const returnedIndexesByBucket = new Map<string, number[]>();

    returnedItems.forEach((item, index) => {
      const productId = resolveSalesItemProductId(item);
      if (!productId) return;
      const partyId = resolveItemPurchasePartyId(item, productsBySoul);
      if (!partyId) return;
      const adjustedQuantity = getAdjustedQuantity(
        item,
        productsBySoul.get(productId),
      );
      const key = `${productId}::${partyId}`;
      returnedByBucket.set(
        key,
        (returnedByBucket.get(key) || 0) + adjustedQuantity,
      );
      returnedIndexesByBucket.set(key, [
        ...(returnedIndexesByBucket.get(key) || []),
        index,
      ]);
    });

    for (const [bucketKey, returnedQty] of returnedByBucket.entries()) {
      const dispatchedQty = Number(dispatchedByBucket[bucketKey] || 0);
      if (returnedQty <= dispatchedQty) continue;

      const [productId, partyId] = bucketKey.split('::');
      const productTitle =
        productsBySoul.get(productId)?.title ?? 'This product';
      const partyName =
        partyId === UNASSIGNED_STOCK_BUCKET
          ? 'Unassigned'
          : partiesBySoul.get(partyId)?.name || 'selected party';

      const message =
        dispatchedQty > 0
          ? `${productTitle} can return at most ${dispatchedQty} for ${partyName}. You entered ${returnedQty}.`
          : `${productTitle} was not dispatched for ${partyName}.`;
      const indexes = returnedIndexesByBucket.get(bucketKey) || [];

      for (const index of indexes) {
        ctx.addIssue({
          code: 'custom',
          message,
          path: [fieldPath, index, 'quantity'],
        });
      }
    }
  }

  function assertOutflowItemsByParty({
    items,
    aggregate,
    contextLabel,
  }: {
    items: SalesItem[] | undefined;
    aggregate: ReturnType<typeof aggregateStockBookEntries>;
    contextLabel: string;
  }) {
    if (!items?.length) {
      throw new Error(`Cannot process ${contextLabel} without line items.`);
    }

    const totalsByBucket = new Map<string, number>();
    for (const item of items) {
      const productId = resolveSalesItemProductId(item);
      if (!productId) continue;
      const partyId = resolveItemPurchasePartyId(item, productsBySoul);
      if (!partyId) {
        throw new Error(
          `Every product in ${contextLabel} must be associated with a party.`,
        );
      }
      const adjustedQuantity = getAdjustedQuantity(
        item,
        productsBySoul.get(productId),
      );
      const key = `${productId}::${partyId}`;
      totalsByBucket.set(
        key,
        (totalsByBucket.get(key) || 0) + adjustedQuantity,
      );
    }

    for (const [bucketKey, requestedQty] of totalsByBucket.entries()) {
      const [productId, partyId] = bucketKey.split('::');
      const available = getProductPartyAvailability(
        aggregate,
        productId,
        partyId,
      );
      if (requestedQty <= available) continue;
      const productTitle =
        productsBySoul.get(productId)?.title ?? 'This product';
      const partyName =
        partyId === UNASSIGNED_STOCK_BUCKET
          ? 'Unassigned'
          : partiesBySoul.get(partyId)?.name || 'selected party';
      throw new Error(
        `${productTitle} has ${available} available for ${partyName}. Requested ${requestedQty}.`,
      );
    }
  }

  async function reconcileTripReturnStockAndSale({
    tripId,
    trip,
  }: {
    tripId: string;
    trip:
    | {
      _?: { soul?: string };
      dispatchTime?: string;
      returnTime?: string;
      vehicleId?: string;
      products?: SalesItem[];
      returnedProducts?: SalesItem[];
    }
    | undefined;
  }) {
    if (!trip?.returnTime || !trip?.products?.length) return;

    assertOutflowItemsByParty({
      items: trip.products,
      aggregate: stockAggregateExcludingSource('trip', tripId),
      contextLabel: 'trip dispatch',
    });

    await clearStockBookEntriesBySource('trip', tripId);
    await createStockBookEntriesFromItems({
      sourceTable: 'trip',
      sourceId: tripId,
      transactionType: 'stock',
      movementType: 'tripDispatch',
      direction: 'out',
      entryDate: trip.dispatchTime,
      items: trip.products,
      particularsPrefix: 'Trip Dispatch',
      fiscalYear: calculateFiscalYear(),
      requireOriginPartyId: true,
    });

    const dispatchedByBucket = getItemsByProductAndPartyQuantity(
      trip.products,
      productsBySoul as Map<string, ProductStockRecord>,
    );
    const returnedByBucket = getItemsByProductAndPartyQuantity(
      trip.returnedProducts,
      productsBySoul as Map<string, ProductStockRecord>,
    );

    for (const [bucketKey, returnedQty] of Object.entries(returnedByBucket)) {
      const dispatchedQty = Number(dispatchedByBucket[bucketKey] || 0);
      const normalizedReturnedQty = Number(returnedQty || 0);
      if (normalizedReturnedQty <= dispatchedQty) continue;
      const [productId, partyId] = bucketKey.split('::');
      const productTitle =
        productsBySoul.get(productId)?.title ?? 'This product';
      const partyName =
        partyId === UNASSIGNED_STOCK_BUCKET
          ? 'Unassigned'
          : partiesBySoul.get(partyId)?.name || 'selected party';
      throw new Error(
        `${productTitle} can return at most ${dispatchedQty} for ${partyName}. You entered ${normalizedReturnedQty}.`,
      );
    }

    const soldProductsByBucket = Object.entries(dispatchedByBucket)
      .map(([key, dispatchedQty]) => {
        const soldQty =
          Number(dispatchedQty || 0) - Number(returnedByBucket[key] || 0);
        if (soldQty <= 0) return null;
        const [productId, purchasePartyId] = key.split('::');
        if (!productId || !purchasePartyId) return null;
        return {
          productId,
          purchasePartyId,
          quantity: soldQty,
        };
      })
      .filter(
        (
          item,
        ): item is {
          productId: string;
          purchasePartyId: string;
          quantity: number;
        } => Boolean(item),
      );
    const soldByProduct = soldProductsByBucket.reduce(
      (acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
      },
      {} as Record<string, number>,
    );

    const products = await db.product.get({ keys: [slug] });
    const productsBySoulFromDb = new Map(
      products
        .filter((item) => item?._?.soul)
        // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
        .map((item) => [item._?.soul!, item]),
    );

    await createStockBookEntriesFromItems({
      sourceTable: 'trip',
      sourceId: tripId,
      transactionType: 'stock',
      movementType: 'tripReturn',
      direction: 'in',
      entryDate: trip.returnTime,
      items: trip.returnedProducts,
      particularsPrefix: 'Trip Return',
      fiscalYear: calculateFiscalYear(),
      requireOriginPartyId: true,
    });

    if (!soldProductsByBucket.length) return;

    const invoiceItems = Object.entries(soldByProduct).map(
      ([productId, quantity]) => ({
        product: productId,
        quantity,
        rate: productsBySoulFromDb.get(productId)?.sellingPrice || 0,
        total:
          quantity * (productsBySoulFromDb.get(productId)?.sellingPrice || 0),
      }),
    );

    const totalAmount = Object.entries(soldByProduct).reduce(
      (sum, [productId, quantity]) =>
        sum +
        quantity * (productsBySoulFromDb.get(productId)?.sellingPrice || 0),
      0,
    );

    const vehicles = await db.vehicle.get({ keys: [slug] });
    const vehicle = vehicles.find((item) => item?._?.soul === trip.vehicleId);

    await db.invoice.create(slug)({
      type: 'sale',
      partyId: 'trip-sale',
      issuedAt: new Date().toISOString(),
      items: invoiceItems,
      subTotal: totalAmount,
      tax: 0,
      totalAmount,
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

    await createStockBookEntriesFromItems({
      sourceTable: 'trip',
      sourceId: tripId,
      transactionType: 'sale',
      movementType: 'sale',
      direction: 'out',
      entryDate: trip.returnTime,
      items: soldProductsByBucket.map((soldProduct) => ({
        product: soldProduct.productId,
        purchasePartyId: soldProduct.purchasePartyId,
        quantity: soldProduct.quantity,
        unit: productsBySoulFromDb.get(soldProduct.productId)?.unit || '',
        unitPrice:
          Number(
            productsBySoulFromDb.get(soldProduct.productId)?.sellingPrice,
          ) || 0,
        totalAmount:
          soldProduct.quantity *
          (Number(
            productsBySoulFromDb.get(soldProduct.productId)?.sellingPrice,
          ) || 0),
      })) as SalesItem[],
      particularsPrefix: 'Trip Sale',
      fiscalYear: calculateFiscalYear(),
      requireOriginPartyId: true,
    });
  }

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
        async onCreate() { },
        async onUpdate() { },
        async onDelete(_, id) {
          await clearStockBookEntriesBySource('product', id);
          await clearStockBookEntriesBySource('manual', id);
        },
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema.superRefine((data, ctx) => {
            if (!data?.items?.length) return;

            data.items.forEach((item, index) => {
              const productId = resolveSalesItemProductId(item);
              if (!productId) return;

              const product = productsBySoul.get(productId);
              if (!product) return;
              const sellingPrice = Number(product?.sellingPrice ?? 0);
              const costPrice = Number(item?.unitPrice ?? 0);
              if (!Number.isFinite(costPrice) || costPrice <= 0) return;
              if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return;

              const minimumSellingPrice = costPrice * 1.05;
              if (sellingPrice >= minimumSellingPrice) return;

              ctx.addIssue({
                code: 'custom',
                message: `${product?.title ?? 'Selected product'} selling price should be at least ${minimumSellingPrice.toFixed(2)}.`,
                path: ['items', index, 'unitPrice'],
              });
            });
          }),
        async onCreate(data, variables) {
          const createdId = getMutationId(data);

          const invoiceItems = buildInvoiceItems(
            variables.items,
            productsBySoul,
          );

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
            ...(createdId ? { id: createdId } : {}),
            type: 'purchase',
            partyId: variables.party,
            issuedAt: variables.importDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            totalAmount,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });

          await createStockBookEntriesFromItems({
            sourceTable: 'stockImport',
            sourceId: createdId,
            transactionType: 'purchase',
            movementType: 'purchase',
            direction: 'in',
            entryDate: variables.importDate,
            items: variables.items,
            counterpartyId: variables.party,
            particularsPrefix: 'Purchase',
            fiscalYear: calculateFiscalYear(),
          });
        },
        async onUpdate(_, variables, updateContext) {
          const stockImport = stockImportsBySoul.get(variables.id);
          const currentStockImport =
            (updateContext as UpdateContext<'stockImport'>)?.newData ??
            stockImport;
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

          await clearStockBookEntriesBySource('stockImport', variables.id);
          await createStockBookEntriesFromItems({
            sourceTable: 'stockImport',
            sourceId: variables.id,
            transactionType: 'purchase',
            movementType: 'purchase',
            direction: 'in',
            entryDate: currentStockImport?.importDate ?? variables.importDate,
            items,
            counterpartyId: currentStockImport?.party ?? variables.party,
            particularsPrefix: 'Purchase',
            fiscalYear: calculateFiscalYear(),
          });
        },
        async onDelete(_, id) {
          await clearStockBookEntriesBySource('stockImport', id);
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema
            .extend({
              items: buildOutflowItemSchema({
                includeProductPartyInLabel: true,
              })
                .array()
                .min(1, { message: 'Please add at least one item.' })
                .describe('Items Sold'),
            })
            .superRefine((data, ctx) => {
              validateOutflowItemsByParty({
                items: data?.items,
                ctx,
                fieldPath: 'items',
                aggregate: stockAggregateExcludingSource('sale', data?._?.soul),
              });
            }),
        async onCreate(data, variables) {
          const createdId = getMutationId(data);
          assertOutflowItemsByParty({
            items: variables.items,
            aggregate: stockAggregateExcludingSource('sale', createdId),
            contextLabel: 'sale',
          });

          const invoiceItems = buildInvoiceItems(
            variables.items,
            productsBySoul as Map<string, ProductStockRecord>,
          );

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

          await createStockBookEntriesFromItems({
            sourceTable: 'sale',
            sourceId: createdId,
            transactionType: 'sale',
            movementType: 'sale',
            direction: 'out',
            entryDate: variables.saleDate,
            items: variables.items,
            counterpartyId: variables.customerId,
            particularsPrefix: 'Sale',
            fiscalYear: calculateFiscalYear(),
            requireOriginPartyId: true,
          });

          await db.invoice.create(slug)({
            ...(createdId ? { id: createdId } : {}),
            type: 'sale',
            partyId: variables.customerId,
            issuedAt: variables.saleDate,
            items: invoiceItems,
            subTotal: totalAmount,
            tax: 0,
            totalAmount,
            payments,
            paidAmount,
            paymentStatus: getPaymentStatusFromTotals({
              paidAmount,
              totalAmount,
            }),
            fiscalYear: calculateFiscalYear(),
          });
        },
        async onUpdate(_, variables, updateContext) {
          const sale = salesBySoul.get(variables.id);
          const currentSale =
            (updateContext as UpdateContext<'sale'>)?.newData ?? sale;
          const items = currentSale?.items ?? variables.items;
          assertOutflowItemsByParty({
            items,
            aggregate: stockAggregateExcludingSource('sale', variables.id),
            contextLabel: 'sale',
          });
          const totalAmount = getTotalAmount(items);
          const payments = normalizePaymentsWithFallback(
            currentSale?.payments ?? variables.payments,
            currentSale?.paidAmount ?? variables.paidAmount,
          );
          const paidAmount = getPaidAmountFromPayments(payments);

          await clearStockBookEntriesBySource('sale', variables.id);
          await createStockBookEntriesFromItems({
            sourceTable: 'sale',
            sourceId: variables.id,
            transactionType: 'sale',
            movementType: 'sale',
            direction: 'out',
            entryDate: currentSale?.saleDate ?? variables.saleDate,
            items,
            counterpartyId: currentSale?.customerId ?? variables.customerId,
            particularsPrefix: 'Sale',
            fiscalYear: calculateFiscalYear(),
            requireOriginPartyId: true,
          });
          await db.invoice.update(slug)({
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
        async onDelete(_, id) {
          await clearStockBookEntriesBySource('sale', id);
        },
      },
      {
        schema: 'stockBook',
        slug,
        readOnly: true,
        previewOverrides: {
          productId: (id) => productsBySoul.get(id)?.title ?? '-',
          counterpartyId: (id) =>
            partiesBySoul.get(id)?.name ||
            customersBySoul.get(id)?.name ||
            (typeof id === 'string' ? (id.split('/').at(-1) ?? id) : '-'),
          originPartyId: (id) =>
            partiesBySoul.get(id)?.name ||
            (typeof id === 'string' ? (id.split('/').at(-1) ?? id) : '-'),
          sourceId: (id) =>
            typeof id === 'string' ? (id.split('/').at(-1) ?? id) : '-',
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
            }));
            if (!mapped) return;
            mapped['#'] = items?.['#'];
            return mapped;
          },
        },
        extender: (schema) =>
          schema
            .extend({
              items: buildOutflowItemSchema()
                .array()
                .min(1, { message: 'Please add at least one item.' })
                .describe('Items Ordered'),
            })
            .superRefine((data, ctx) => {
              if (data.orderStatus !== 'done') return;
              validateOutflowItemsByParty({
                items: data?.items,
                ctx,
                fieldPath: 'items',
                aggregate: stockAggregateExcludingSource(
                  'order',
                  data?._?.soul,
                ),
              });
            }),
        async onCreate(data, variables) {
          if (variables.orderStatus !== 'done') return;
          const createdId = getMutationId(data);

          try {
            assertOutflowItemsByParty({
              items: variables.items,
              aggregate: stockAggregateExcludingSource('order', createdId),
              contextLabel: 'order completion',
            });

            const invoiceItems = buildInvoiceItems(
              variables.items,
              productsBySoul as Map<string, ProductStockRecord>,
            );

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

            await createStockBookEntriesFromItems({
              sourceTable: 'order',
              sourceId: createdId,
              transactionType: 'sale',
              movementType: 'order',
              direction: 'out',
              entryDate: new Date().toISOString(),
              items: variables.items,
              counterpartyId: variables.customerId,
              particularsPrefix: 'Order Fulfilled',
              fiscalYear: calculateFiscalYear(),
              requireOriginPartyId: true,
            });

            await db.invoice.create(slug)({
              type: 'sale',
              partyId: variables.customerId,
              issuedAt: new Date().toISOString(),
              items: invoiceItems,
              subTotal: totalAmount,
              tax: 0,
              totalAmount,
              payments,
              paidAmount,
              paymentStatus: getPaymentStatusFromTotals({
                paidAmount,
                totalAmount,
              }),
              fiscalYear: calculateFiscalYear(),
            });
          } catch (error) {
            if (createdId) {
              await clearStockBookEntriesBySource('order', createdId);
              await db.order.update(slug)({
                id: createdId,
                orderStatus: 'pending',
              });
            }
            throw error;
          }
        },
        async onUpdate(_, variables, updateContext) {
          if (variables.orderStatus !== 'done') return;
          const currentOrder =
            (updateContext as UpdateContext<'order'>)?.previousData ??
            ordersBySoul.get(variables.id);
          if (currentOrder?.orderStatus === 'done') return;
          const order =
            (updateContext as UpdateContext<'order'>)?.newData ??
            ordersBySoul.get(variables.id);
          if (!order?.items?.length || !order?.customerId) return;

          try {
            assertOutflowItemsByParty({
              items: order.items,
              aggregate: stockAggregateExcludingSource('order', variables.id),
              contextLabel: 'order completion',
            });

            const invoiceItems = buildInvoiceItems(
              order.items,
              productsBySoul as Map<string, ProductStockRecord>,
            );

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

            await clearStockBookEntriesBySource('order', variables.id);
            await createStockBookEntriesFromItems({
              sourceTable: 'order',
              sourceId: variables.id,
              transactionType: 'sale',
              movementType: 'order',
              direction: 'out',
              entryDate: new Date().toISOString(),
              items: order.items,
              counterpartyId: order.customerId,
              particularsPrefix: 'Order Fulfilled',
              fiscalYear: calculateFiscalYear(),
              requireOriginPartyId: true,
            });

            await db.invoice.create(slug)({
              type: 'sale',
              partyId: order.customerId,
              issuedAt: new Date().toISOString(),
              items: invoiceItems,
              subTotal: totalAmount,
              tax: 0,
              totalAmount,
              payments,
              paidAmount,
              paymentStatus: getPaymentStatusFromTotals({
                paidAmount,
                totalAmount,
              }),
              fiscalYear: calculateFiscalYear(),
            });
          } catch (error) {
            await clearStockBookEntriesBySource('order', variables.id);
            await db.order.update(slug)({
              id: variables.id,
              orderStatus: 'pending',
            });
            throw error;
          }
        },
        async onDelete(_, id) {
          await clearStockBookEntriesBySource('order', id);
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
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
              product:
                productsBySoul.get(resolveSalesItemProductId(item))?.title ??
                '-',
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
              products: buildOutflowItemSchema()
                .array()
                .min(1, {
                  message: 'At least one product must be sent on a trip.',
                })
                .describe('Products Sent on Trip'),
              returnedProducts: buildTripReturnedItemSchema()
                .array()
                .optional()
                .describe('Products Returned from Trip'),
            })
            .superRefine((data, ctx) => {
              validateOutflowItemsByParty({
                items: data?.products,
                ctx,
                fieldPath: 'products',
                aggregate: stockAggregateExcludingSource('trip', data?._?.soul),
              });
              validateReturnedItemsByDispatchedBuckets({
                dispatchedItems: data?.products,
                returnedItems: data?.returnedProducts,
                ctx,
                fieldPath: 'returnedProducts',
              });
            }),
        async onCreate(data, variables) {
          assertOutflowItemsByParty({
            items: variables.products,
            aggregate: stockAggregateExcludingSource(
              'trip',
              getMutationId(data),
            ),
            contextLabel: 'trip dispatch',
          });
          await createStockBookEntriesFromItems({
            sourceTable: 'trip',
            sourceId: getMutationId(data),
            transactionType: 'stock',
            movementType: 'tripDispatch',
            direction: 'out',
            entryDate: variables.dispatchTime,
            items: variables.products,
            particularsPrefix: 'Trip Dispatch',
            fiscalYear: calculateFiscalYear(),
            requireOriginPartyId: true,
          });
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
          await reconcileTripReturnStockAndSale({
            tripId: variables.id,
            trip,
          });
        },
        async onDelete(_, id) {
          await clearStockBookEntriesBySource('trip', id);
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
                              const productId = resolveSalesItemProductId(
                                product as SalesItemRuntime,
                              );
                              return (
                                <div
                                  key={product._?.soul ?? ''}
                                  className="grid grid-cols-3 gap-2 text-sm"
                                >
                                  <div>
                                    {productsBySoul.get(productId)?.title ||
                                      'Unknown Product'}
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
                                product: resolveSalesItemProductId(
                                  p as SalesItemRuntime,
                                ),
                                totalAmount:
                                  (p.quantity ?? 0) * (p.unitPrice ?? 0),
                              })),
                            }}
                            schema={z.object({
                              returnedProducts:
                                returnedProductsSchemaWithProducts(
                                  row.original.products ?? [],
                                ),
                            })}
                            onSubmit={async (data) => {
                              const tripId = row.original._?.soul ?? '';
                              if (!tripId) return;
                              const returnTime = new Date().toISOString();
                              const previousTrip =
                                tripsBySoul.get(tripId) ?? row.original;
                              const nextTrip = {
                                ...previousTrip,
                                returnTime,
                                returnedProducts: data.returnedProducts,
                              };

                              await db.trip.update(slug)({
                                id: tripId,
                                returnTime,
                                returnedProducts: data.returnedProducts,
                              });
                              await reconcileTripReturnStockAndSale({
                                tripId,
                                trip: nextTrip,
                              });
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
