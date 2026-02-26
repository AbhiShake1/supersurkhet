import { Plus } from 'lucide-react';
import NepaliDate from 'nepali-datetime';
import { useMemo, useState } from 'react';
import { AutoKanban } from '@/components/auto-admin';
import { AddRowDialog } from '@/components/auto-admin/add-row-dialog';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/intl';
import type { Order } from '@/lib/schema';
import type { SalesItem } from '@/lib/schemas/retail';
import { db } from '@/lib/ssr/api';
import { cn, soulToId } from '@/lib/utils';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from '../credenza';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { AdminComponent } from '.';

type PaymentInput = {
  paidAt?: string | null;
  paidAmount?: number | string | null;
} | null;

function isOrderItem(value: unknown): value is SalesItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.product === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    typeof item.unitPrice === 'number' &&
    Number.isFinite(item.unitPrice)
  );
}

function getOrderItems(order: Order | undefined) {
  if (!order || !Array.isArray(order.items)) return [] as SalesItem[];
  return order.items.filter(isOrderItem);
}

function normalizePaymentsWithFallback(
  payments: PaymentInput[] | undefined,
  fallbackPaidAmount: number | undefined,
) {
  if (Array.isArray(payments) && payments.length) {
    return payments.map((payment) => ({
      paidAt: payment?.paidAt || new Date().toISOString(),
      paidAmount: Number(payment?.paidAmount ?? 0),
    }));
  }

  const paidAmount = Number(fallbackPaidAmount ?? 0);
  if (!paidAmount) return [];
  return [{ paidAt: new Date().toISOString(), paidAmount }];
}

const OrderKanban: AdminComponent = ({ slug }) => {
  const { data: products } = api.product.useGet({ keys: [slug] });
  const { data: orders } = api.order.useGet({ keys: [slug] });
  const ordersBySoul = new Map(orders?.map((o) => [o._?.soul, o]));
  const productsBySoul = new Map(products?.map((p) => [p._?.soul, p]));
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddRowDialog
          schema="order"
          slug={slug}
          buttonLabel="Add New Order"
          buttonIcon={<Plus className="h-4 w-4" />}
        />
      </div>
      <AutoKanban
        slug={slug}
        cardBuilder={(order) => <OrderCard order={order} slug={slug} />}
        groupKey="orderStatus"
        schema="order"
        isItemLocked={(order) =>
          order.orderStatus === 'done' || order.orderStatus === 'cancelled'
        }
        onUpdate={(_, variables) => {
          if (variables.orderStatus !== 'done') return;
          const order = ordersBySoul.get(variables.id);
          const orderItems = getOrderItems(order);
          if (!orderItems.length || !order?.customerId) return;

          const itemsByProductIdWithQuantity = orderItems.reduce(
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

          const invoiceItems = orderItems.map((item) => {
            const productInfo = productsBySoul.get(item.product);
            let adjustedQuantity = item.quantity;

            if (productInfo?.unit?.includes(':')) {
              const [unitType, piecesPerUnit] = productInfo.unit.split(':');
              if (item.unit === unitType) {
                adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
              }
            }

            return {
              product: item.product,
              quantity: adjustedQuantity,
              rate: item.unitPrice,
              total: item.quantity * item.unitPrice,
            };
          });

          const totalAmount = orderItems.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0,
          );
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
        }}
      />
    </div>
  );
};

function OrderCard({ order, slug }: { order: Order; slug: string }) {
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });
  const { data: menuItems = [] } = api.menuItem.useGet({ keys: [slug] });
  const customerById = useMemo(
    () => new Map(customers.map((c) => [c._?.soul, c])),
    [customers],
  );
  const { data: products = [] } = api.product.useGet({ keys: [slug] });

  const productById = useMemo(
    () => new Map(products.map((p) => [p._?.soul, p])),
    [products],
  );

  const [open, setOpen] = useState(false);
  const orderItems = getOrderItems(order);
  if (!orderItems.length) return null;

  function getBackgroundProps() {
    switch (order.orderStatus) {
      case 'pending':
        return {
          className:
            'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
        };
      case 'cancelled':
        return {
          className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
        };

      default:
        return {
          className: '',
        };
    }
  }

  const { className } = getBackgroundProps();

  return (
    <div>
      <Credenza open={open} onOpenChange={setOpen}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Order Details</CredenzaTitle>
            <CredenzaDescription>
              Detailed information about the order.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold">Order ID:</span>
                <span className="col-span-3">{soulToId(order._?.soul)}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-semibold">Items:</span>
                <span className="col-span-3">
                  {orderItems.map((item) => {
                    return (
                      <div key={item._?.soul} className="flex justify-between">
                        <span>
                          <span className="font-bold">{item.quantity}x</span>{' '}
                          {productById.get(item.product)?.title}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    );
                  })}
                </span>
              </div>
              {order.customerId && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">Customer:</span>
                  <span className="col-span-3">
                    {customerById.get(order.customerId)?.name}
                  </span>{' '}
                </div>
              )}
              {order.subTotal && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">Subtotal:</span>
                  <span className="col-span-3">
                    Ra. {order.subTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {order.taxes && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">Taxes:</span>
                  <span className="col-span-3">
                    Rs. {order.taxes.toFixed(2)}
                  </span>
                </div>
              )}
              {order.totalAmount && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">Total:</span>
                  <span className="col-span-3">
                    Rs. {order.totalAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {order.paymentMethod && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">
                    Payment Method:
                  </span>
                  <span className="col-span-3 capitalize">
                    {order.paymentMethod}
                  </span>
                </div>
              )}
              {order.paymentStatus && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">
                    Payment Status:
                  </span>
                  <span className="col-span-3 capitalize">
                    {order.paymentStatus}
                  </span>
                </div>
              )}
              {order.estimatedDeliveryTime && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="text-right font-semibold">
                    Est. Delivery:
                  </span>
                  <span className="col-span-3">
                    {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              {/* {order.orderStatus !== "cancelled" && (
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="destructive">
                          Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will mark the order as cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Nevermind</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelOrder}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )} */}
            </div>
          </CredenzaBody>
        </CredenzaContent>
      </Credenza>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: lint debt cleanup */}
      <div
        className={cn(
          className,
          'rounded-md border bg-card p-3 shadow-xs flex flex-col gap-2',
        )}
        onClick={() => setOpen(true)}
      >
        <div className={cn('flex items-center justify-between gap-2')}>
          <span className="line-clamp-1 font-medium text-sm">
            {orderItems
              .map((item) =>
                menuItems.find(
                  (menuItem) => menuItem?._?.soul === item.product,
                ),
              )
              .map((menuItem) => menuItem?.title)
              .filter((title): title is string => Boolean(title))
              .join(', ')}
          </span>
          <div className="flex items-center justify-between gap-2">
            {/* Truncated items preview */}
            <span className="line-clamp-1 font-medium text-sm">
              {orderItems
                .slice(0, 3)
                .map(
                  (item) =>
                    `${item.quantity}x ${productById.get(item.product)?.title ?? 'Unknown'}`,
                )
                .join(', ')}
              {orderItems.length > 3
                ? ` ...and ${orderItems.length - 3} more`
                : ''}
            </span>

            <Tooltip>
              <TooltipTrigger>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800 cursor-pointer">
                  {formatCurrency(order.paidAmount ?? 0)}
                </span>
              </TooltipTrigger>

              <TooltipContent className="max-w-xs">
                <div className="flex flex-col gap-2 justify-between w-full">
                  {orderItems.map((item) => (
                    <div key={item._?.soul}>
                      <div className=" flex justify-between gap-2">
                        <span className="font-medium">
                          {item.quantity}x{' '}
                          {productById.get(item.product)?.title ?? 'Unknown'}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPaidAmountFromPayments(payments: PaymentInput[] | undefined) {
  if (!Array.isArray(payments) || !payments.length) return 0;
  return payments.reduce((sum, payment) => {
    const paidAmount = Number(payment?.paidAmount ?? 0);
    return Number.isFinite(paidAmount) ? sum + paidAmount : sum;
  }, 0);
}

export function getPaymentStatusFromTotals({
  paidAmount,
  totalAmount,
}: {
  paidAmount: number;
  totalAmount: number;
}): string {
  if (paidAmount === totalAmount) return 'paid';
  if (paidAmount === 0) return 'pending';
  if (paidAmount > totalAmount) return 'overpaid (invalid)';
  return `partial (${formatCurrency(totalAmount - paidAmount)} to pay)`;
}

function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year
    .toString()
    .slice(2)}/${(year + 1).toString().slice(2)}`;
}

export default OrderKanban;
