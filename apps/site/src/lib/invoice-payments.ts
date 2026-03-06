import type { Invoice } from '@/lib/schema';

type InvoicePayment = {
  paidAt?: string;
  paidAmount?: number;
  paymentMethod?: string;
  bankVoucherNumber?: string;
};

type InvoicePaymentLike = Pick<
  Invoice,
  'payments' | 'paidAmount' | 'issuedAt' | 'subTotal' | 'tax'
>;

function toSafeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function getInvoicePayments<T extends InvoicePaymentLike>(
  invoice: T,
): InvoicePayment[] {
  if (!Array.isArray(invoice.payments) || !invoice.payments.length) {
    if (!invoice.paidAmount) return [];
    return [
      {
        paidAt: invoice.issuedAt,
        paidAmount: toSafeNumber(invoice.paidAmount),
      },
    ];
  }

  return invoice.payments.map((payment) => ({
    paidAt: payment.paidAt,
    paidAmount: toSafeNumber(payment.paidAmount),
    paymentMethod: payment.paymentMethod,
    bankVoucherNumber: payment.bankVoucherNumber,
  }));
}

export function getInvoicePaidAmount<T extends InvoicePaymentLike>(
  invoice: T,
): number {
  const payments = getInvoicePayments(invoice);
  if (!payments.length) return toSafeNumber(invoice.paidAmount);
  return payments.reduce((sum, payment) => sum + toSafeNumber(payment.paidAmount), 0);
}

export function getInvoiceTotalAmount<T extends InvoicePaymentLike>(
  invoice: T,
): number {
  return toSafeNumber(invoice.subTotal) + toSafeNumber(invoice.tax);
}

export function getInvoiceOutstandingAmount<T extends InvoicePaymentLike>(
  invoice: T,
): number {
  return getInvoiceTotalAmount(invoice) - getInvoicePaidAmount(invoice);
}

export function getInvoicePaymentProgress<T extends InvoicePaymentLike>(
  invoice: T,
): number {
  const total = getInvoiceTotalAmount(invoice);
  if (total <= 0) return 0;
  const paid = getInvoicePaidAmount(invoice);
  const raw = (paid / total) * 100;
  return Math.max(0, Math.min(100, raw));
}
