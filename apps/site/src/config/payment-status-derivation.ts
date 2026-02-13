import { formatCurrency } from '@/lib/intl';

type PaymentStatusItem = {
  quantity?: number | null;
  unitPrice?: number | null;
  totalAmount?: number | null;
} | null;

export function getItemsTotalForPaymentStatus(items: PaymentStatusItem[] = []): number {
  if (!Array.isArray(items) || !items.length) return 0;

  return items.reduce((sum, item) => {
    if (!item) return sum;

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
      return sum + quantity * unitPrice;
    }

    const explicitTotal = Number(item.totalAmount);
    if (item.totalAmount != null && Number.isFinite(explicitTotal)) {
      return sum + explicitTotal;
    }
    return sum;
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
