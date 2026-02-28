import type { RuntimeActionHandlers } from '@/lib/plugins/types';
import { db } from '@/lib/ssr/api';

type PaymentInput = {
  paidAt?: string | null;
  paidAmount?: number | string | null;
  paymentMethod?: string | null;
  bankVoucherNumber?: string | null;
} | null;

type ProductStockRecord = {
  _?: { soul?: string };
  unit?: string | null;
  stockQuantity?: number | null;
  sellingPrice?: number | null;
};

type ItemInput = {
  product?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
} | null;

function calculateFiscalYear() {
  const year = new Date().getFullYear();
  return `${String(year).slice(2)}/${String(year + 1).slice(2)}`;
}

function getAdjustedQuantity(
  item: ItemInput,
  productInfo?: ProductStockRecord,
) {
  let adjustedQuantity = Number(item?.quantity ?? 0);
  if (!productInfo?.unit?.includes(':')) return adjustedQuantity;

  const [unitType, piecesPerUnit] = productInfo.unit.split(':');
  const parsedPiecesPerUnit = Number.parseInt(piecesPerUnit, 10);
  if (!Number.isFinite(parsedPiecesPerUnit) || item?.unit !== unitType) {
    return adjustedQuantity;
  }

  adjustedQuantity = adjustedQuantity * parsedPiecesPerUnit;
  return adjustedQuantity;
}

function getItemsByProductIdWithQuantity(
  items: ItemInput[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items?.reduce(
      (acc, item) => {
        if (!item?.product) return acc;
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
  items: ItemInput[] | undefined,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  return (
    items?.flatMap((item) => {
      if (!item?.product) return [];
      const quantity = getAdjustedQuantity(
        item,
        productsBySoul.get(item.product),
      );
      return [
        {
          product: item.product,
          quantity,
          rate: Number(item.unitPrice ?? 0),
          total: Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0),
        },
      ];
    }) ?? []
  );
}

function getTotalAmount(items: ItemInput[] | undefined) {
  return (
    items?.reduce(
      (sum, item) =>
        sum + Number(item?.quantity ?? 0) * Number(item?.unitPrice ?? 0),
      0,
    ) ?? 0
  );
}

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

function getPaymentStatus(paidAmount: number, totalAmount: number) {
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

async function getProductsBySoul(businessId: string) {
  const products = await db.product.get({ keys: [businessId] });
  return new Map(
    products
      .filter((item) => item?._?.soul)
      .map((item) => [String(item._?.soul), item as ProductStockRecord]),
  );
}

async function applyProductDeltas(
  businessId: string,
  deltas: Record<string, number>,
  productsBySoul: Map<string, ProductStockRecord>,
) {
  for (const [productId, delta] of Object.entries(deltas)) {
    if (!delta) continue;
    const product = productsBySoul.get(productId);
    if (!product?._?.soul) continue;
    await db.product.update(businessId)({
      id: product._.soul,
      stockQuantity: Number(product.stockQuantity || 0) + delta,
    });
  }
}

async function upsertInvoiceForStockImport({
  businessId,
  rowId,
  row,
  productsBySoul,
}: {
  businessId: string;
  rowId: string;
  row: Record<string, unknown>;
  productsBySoul: Map<string, ProductStockRecord>;
}) {
  const items = (row.items as ItemInput[] | undefined) ?? [];
  const totalAmount = getTotalAmount(items);
  const payments = normalizePaymentsWithFallback(
    row.payments as PaymentInput[] | undefined,
    Number(row.paidAmount ?? 0),
  );
  const paidAmount = getPaidAmountFromPayments(payments);

  await db.invoice.update(businessId)({
    id: rowId,
    type: 'purchase',
    partyId: String(row.party ?? ''),
    issuedAt:
      typeof row.importDate === 'string'
        ? row.importDate
        : new Date().toISOString(),
    items: buildInvoiceItems(items, productsBySoul),
    subTotal: totalAmount,
    tax: 0,
    totalAmount,
    payments,
    paidAmount,
    paymentStatus: getPaymentStatus(paidAmount, totalAmount),
    fiscalYear: calculateFiscalYear(),
  });
}

async function upsertInvoiceForSale({
  businessId,
  rowId,
  row,
  productsBySoul,
}: {
  businessId: string;
  rowId: string;
  row: Record<string, unknown>;
  productsBySoul: Map<string, ProductStockRecord>;
}) {
  const items = (row.items as ItemInput[] | undefined) ?? [];
  const totalAmount = getTotalAmount(items);
  const payments = normalizePaymentsWithFallback(
    row.payments as PaymentInput[] | undefined,
    Number(row.paidAmount ?? 0),
  );
  const paidAmount = getPaidAmountFromPayments(payments);

  await db.invoice.update(businessId)({
    id: rowId,
    type: 'sale',
    partyId: String(row.customerId ?? ''),
    issuedAt:
      typeof row.saleDate === 'string'
        ? row.saleDate
        : new Date().toISOString(),
    items: buildInvoiceItems(items, productsBySoul),
    subTotal: totalAmount,
    tax: 0,
    totalAmount,
    payments,
    paidAmount,
    paymentStatus: getPaymentStatus(paidAmount, totalAmount),
    fiscalYear: calculateFiscalYear(),
  });
}

async function handleStockImportLifecycle(input: {
  businessId: string;
  hook?: string;
  rowId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const { businessId, hook, rowId, before, after } = input;
  if (!after) return;

  const productsBySoul = await getProductsBySoul(businessId);

  if (hook === 'afterCreate') {
    const currentItemsByProduct = getItemsByProductIdWithQuantity(
      after.items as ItemInput[] | undefined,
      productsBySoul,
    );
    await applyProductDeltas(businessId, currentItemsByProduct, productsBySoul);
  } else if (hook === 'afterUpdate') {
    const previousItemsByProduct = getItemsByProductIdWithQuantity(
      before?.items as ItemInput[] | undefined,
      productsBySoul,
    );
    const currentItemsByProduct = getItemsByProductIdWithQuantity(
      after.items as ItemInput[] | undefined,
      productsBySoul,
    );
    const affectedProductIds = new Set([
      ...Object.keys(previousItemsByProduct),
      ...Object.keys(currentItemsByProduct),
    ]);
    const deltas: Record<string, number> = {};
    for (const productId of affectedProductIds) {
      deltas[productId] =
        (currentItemsByProduct[productId] || 0) -
        (previousItemsByProduct[productId] || 0);
    }
    await applyProductDeltas(businessId, deltas, productsBySoul);
  }

  await upsertInvoiceForStockImport({
    businessId,
    rowId,
    row: after,
    productsBySoul,
  });
}

async function handleSaleLifecycle(input: {
  businessId: string;
  hook?: string;
  rowId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const { businessId, hook, rowId, before, after } = input;
  if (!after) return;

  const productsBySoul = await getProductsBySoul(businessId);

  if (hook === 'afterCreate') {
    const currentItemsByProduct = getItemsByProductIdWithQuantity(
      after.items as ItemInput[] | undefined,
      productsBySoul,
    );
    const deltas = Object.fromEntries(
      Object.entries(currentItemsByProduct).map(([productId, qty]) => [
        productId,
        -qty,
      ]),
    );
    await applyProductDeltas(businessId, deltas, productsBySoul);
  } else if (hook === 'afterUpdate') {
    const previousItemsByProduct = getItemsByProductIdWithQuantity(
      before?.items as ItemInput[] | undefined,
      productsBySoul,
    );
    const currentItemsByProduct = getItemsByProductIdWithQuantity(
      after.items as ItemInput[] | undefined,
      productsBySoul,
    );
    const affectedProductIds = new Set([
      ...Object.keys(previousItemsByProduct),
      ...Object.keys(currentItemsByProduct),
    ]);
    const deltas: Record<string, number> = {};
    for (const productId of affectedProductIds) {
      deltas[productId] = -(
        (currentItemsByProduct[productId] || 0) -
        (previousItemsByProduct[productId] || 0)
      );
    }
    await applyProductDeltas(businessId, deltas, productsBySoul);
  }

  await upsertInvoiceForSale({
    businessId,
    rowId,
    row: after,
    productsBySoul,
  });
}

async function handleOrderFinalize(input: {
  businessId: string;
  hook?: string;
  after?: Record<string, unknown>;
  before?: Record<string, unknown>;
}) {
  const { businessId, hook, after, before } = input;
  if (!after) return;

  const nextStatus = String(after.orderStatus ?? '');
  if (nextStatus !== 'done') return;
  if (hook === 'afterUpdate' && String(before?.orderStatus ?? '') === 'done') {
    return;
  }

  const productsBySoul = await getProductsBySoul(businessId);
  const items = (after.items as ItemInput[] | undefined) ?? [];
  const itemsByProduct = getItemsByProductIdWithQuantity(items, productsBySoul);
  const deltas = Object.fromEntries(
    Object.entries(itemsByProduct).map(([productId, qty]) => [productId, -qty]),
  );
  await applyProductDeltas(businessId, deltas, productsBySoul);

  const totalAmount = getTotalAmount(items);
  const payments = normalizePaymentsWithFallback(
    after.payments as PaymentInput[] | undefined,
    Number(after.paidAmount ?? 0),
  );
  const paidAmount = getPaidAmountFromPayments(payments);

  await db.invoice.create(businessId)({
    type: 'sale',
    partyId: String(after.customerId ?? ''),
    issuedAt: new Date().toISOString(),
    items: buildInvoiceItems(items, productsBySoul),
    subTotal: totalAmount,
    tax: 0,
    totalAmount,
    payments,
    paidAmount,
    paymentStatus: getPaymentStatus(paidAmount, totalAmount),
    fiscalYear: calculateFiscalYear(),
  });
}

async function handleTripReconcile(input: {
  businessId: string;
  hook?: string;
  after?: Record<string, unknown>;
  before?: Record<string, unknown>;
}) {
  const { businessId, hook, after, before } = input;
  if (!after) return;
  const productsBySoul = await getProductsBySoul(businessId);

  if (hook === 'afterCreate') {
    const dispatchedByProduct = getItemsByProductIdWithQuantity(
      after.products as ItemInput[] | undefined,
      productsBySoul,
    );
    const deltas = Object.fromEntries(
      Object.entries(dispatchedByProduct).map(([productId, qty]) => [
        productId,
        -qty,
      ]),
    );
    await applyProductDeltas(businessId, deltas, productsBySoul);
    return;
  }

  if (hook !== 'afterUpdate') return;
  if (before?.returnTime) return;
  if (!after.returnTime) return;

  const returnedByProduct = getItemsByProductIdWithQuantity(
    after.returnedProducts as ItemInput[] | undefined,
    productsBySoul,
  );
  await applyProductDeltas(businessId, returnedByProduct, productsBySoul);
}

function resolveRowFromContext(
  ctx: Parameters<RuntimeActionHandlers[string]>[1],
) {
  const before = (ctx.record?.before ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const after = (ctx.record?.after ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const rowId = String(
    ctx.record?.rowId ??
      (after?.id as string | undefined) ??
      (before?.id as string | undefined) ??
      '',
  );
  return { before, after, rowId };
}

export const retailRuntimeActionHandlers: RuntimeActionHandlers = {
  'restaurant.stock.adjust': async (_input, ctx) => {
    if (!ctx.businessId || !ctx.table) return null;
    const { before, after, rowId } = resolveRowFromContext(ctx);
    if (!rowId) return null;

    if (ctx.table === 'stockImport') {
      await handleStockImportLifecycle({
        businessId: ctx.businessId,
        hook: ctx.hook,
        rowId,
        before,
        after,
      });
      return null;
    }

    if (ctx.table === 'sale') {
      await handleSaleLifecycle({
        businessId: ctx.businessId,
        hook: ctx.hook,
        rowId,
        before,
        after,
      });
      return null;
    }

    return null;
  },
  'restaurant.order.finalize': async (_input, ctx) => {
    if (!ctx.businessId) return null;
    const { before, after } = resolveRowFromContext(ctx);
    await handleOrderFinalize({
      businessId: ctx.businessId,
      hook: ctx.hook,
      before,
      after,
    });
    return null;
  },
  'restaurant.trip.reconcile': async (_input, ctx) => {
    if (!ctx.businessId) return null;
    const { before, after } = resolveRowFromContext(ctx);
    await handleTripReconcile({
      businessId: ctx.businessId,
      hook: ctx.hook,
      before,
      after,
    });
    return null;
  },
  'restaurant.invoice.set-status': async (_input, _ctx) => {
    return null;
  },
};
