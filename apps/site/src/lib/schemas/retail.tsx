import { fieldConfig, withSourceCustomData } from "@/components/ui/autoform";
import z from "zod";
import { table } from "./listings";
import type { InferredTable } from "./core/types";
import { isNonNullable } from "../utils";
import { deriveUnitPrice } from "@/config/unit-price-derivation";
import { getItemsTotalForPaymentStatus, getPaymentStatusFromTotals } from "@/config/payment-status-derivation";

export type SalesItem = NonNullable<InferredTable<'sale'>['items']>[number];
type InvoiceItem = NonNullable<InferredTable<'invoice'>['items']>[number];
const paymentMethods = [
  'cash',
  'card',
  'bankTransfer',
  'credit',
  'online',
  'check',
] as const;
const methodsRequiringBankVoucher = new Set(['bankTransfer', 'check']);

const paymentRowSchema = z.object({
  paidAt: z
    .string()
    .datetime({ offset: true })
    .default(() => new Date().toISOString())
    .describe('Paid At')
    .superRefine(fieldConfig({ fieldType: 'datetime' })),
  paidAmount: z
    .number({ coerce: true })
    .nonnegative()
    .describe('Paid Amount')
    .superRefine(fieldConfig({ fieldType: 'number' })),
  paymentMethod: z
    .enum(paymentMethods)
    .optional()
    .describe('Payment Method')
    .superRefine(fieldConfig({ fieldType: 'select' })),
  bankVoucherNumber: z
    .string()
    .optional()
    .describe('Bank Voucher Number')
    .superRefine(
      fieldConfig({
        customData: {
          derive: ({ formValues, rowPath }) => {
            const payment = getValueAtPath(formValues, rowPath) as
              | { paymentMethod?: string | null }
              | undefined;
            const shouldShowBankVoucher = Boolean(
              payment?.paymentMethod &&
                methodsRequiringBankVoucher.has(payment.paymentMethod),
            );
            return {
              inputProps: {
                hidden: !shouldShowBankVoucher,
                type: shouldShowBankVoucher ? 'text' : 'hidden',
              },
            };
          },
        },
      }),
    ),
}).superRefine((payment, ctx) => {
  if (!payment.paymentMethod) return;
  if (!methodsRequiringBankVoucher.has(payment.paymentMethod)) return;

  if (!payment.bankVoucherNumber?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Bank voucher number is required for this payment method.',
      path: ['bankVoucherNumber'],
    });
  }
});

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
}

function getPaidAmountFromFormValues(formValues: {
  payments?: Array<{ paidAmount?: number | null | string } | null> | null;
}) {
  if (!Array.isArray(formValues.payments) || !formValues.payments.length) {
    return 0;
  }

  return formValues.payments.reduce((sum, payment) => {
    if (!payment) return sum;
    const paidAmount = Number(payment.paidAmount ?? 0);
    return Number.isFinite(paidAmount) ? sum + paidAmount : sum;
  }, 0);
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

function createDerivedTotalAmountFieldFromFormValues(formValues: {
  items?: Array<Partial<Pick<SalesItem, 'totalAmount' | 'quantity' | 'unitPrice'>> | null> | null;
}) {
  const totalAmountForValidation = () => {
    const items = Array.isArray(formValues.items) ? formValues.items : [];

    return getItemsTotalForPaymentStatus(
      items.map((item) => {
        if (!item) return null;
        const { quantity, unitPrice, totalAmount } = item;
        return { quantity, unitPrice, totalAmount };
      }),
    );
  };

  return z
    .number({ coerce: true })
    .nonnegative()
    .default(0)
    .describe('Total Amount')
    .superRefine(
      fieldConfig({
        inputProps: {
          readOnly: true,
          disabled: true,
          className: 'border-none',
        },
        customData: {
          derive: () => {
            const totalAmount = totalAmountForValidation();
            const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : 0;
            return {
              inputProps: {
                value: safeTotalAmount,
              },
            };
          },
        },
      }),
    );
}

function createDerivedInvoiceTotalAmountFieldFromFormValues(formValues: {
  subTotal?: unknown;
  tax?: unknown;
}) {
  return z
    .number({ coerce: true })
    .nonnegative()
    .default(0)
    .describe('Total Amount')
    .superRefine(
      fieldConfig({
        inputProps: {
          readOnly: true,
          disabled: true,
          className: 'border-none',
        },
        customData: {
          derive: () => {
            const subTotal = Number(formValues.subTotal ?? 0);
            const tax = Number(formValues.tax ?? 0);
            const totalAmount = subTotal + tax;
            return {
              inputProps: {
                value: Number.isFinite(totalAmount) ? totalAmount : 0,
              },
            };
          },
        },
      }),
    );
}

function createDerivedInvoiceSubTotalFieldFromFormValues(formValues: {
  items?: Array<Partial<Pick<InvoiceItem, 'quantity' | 'rate' | 'total'>> | null> | null;
}) {
  return z
    .number({ coerce: true })
    .int()
    .nonnegative()
    .default(0)
    .describe('Sub Total')
    .superRefine(
      fieldConfig({
        inputProps: {
          readOnly: true,
          disabled: true,
          className: 'border-none',
        },
        customData: {
          derive: () => {
            const items = Array.isArray(formValues.items) ? formValues.items : [];
            const subtotal = items.reduce((sum, item) => {
              if (!item) return sum;
              const explicitTotal = Number(item.total ?? 0);
              const quantity = Number(item.quantity ?? 0);
              const rate = Number(item.rate ?? 0);
              const safeLineTotal = Number.isFinite(explicitTotal)
                ? explicitTotal
                : Number.isFinite(quantity) && Number.isFinite(rate)
                  ? quantity * rate
                  : 0;
              return sum + (Number.isFinite(safeLineTotal) ? safeLineTotal : 0);
            }, 0);

            return {
              inputProps: {
                value: Number.isFinite(subtotal) ? subtotal : 0,
              },
            };
          },
        },
      }),
    );
}

function createDerivedInvoicePaymentStatusFieldFromFormValues(formValues: {
  subTotal?: unknown;
  tax?: unknown;
  payments?: Array<{ paidAmount?: number | null | string } | null> | null;
}) {
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
            const subTotal = Number(formValues.subTotal ?? 0);
            const tax = Number(formValues.tax ?? 0);
            const totalAmount = subTotal + tax;
            const paidAmount = getPaidAmountFromFormValues(formValues);
            return {
              inputProps: {
                value: getPaymentStatusFromTotals({
                  paidAmount,
                  totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
                }),
              },
            };
          },
        },
      }),
    );
}

function createDerivedSalesItemTotalAmountFieldFromFormValues(
  formValues: unknown,
) {
  return z
    .number({ coerce: true })
    .nonnegative()
    .describe('Total Amount')
    .superRefine(
      fieldConfig({
        inputProps: {
          className: 'border-none',
          readOnly: true,
        },
        customData: {
          derive: ({ rowPath }) => {
            const row = getValueAtPath(formValues, rowPath);
            const quantity = Number(
              (row as { quantity?: number | null } | undefined)?.quantity ?? 0,
            );
            const unitPrice = Number(
              (row as { unitPrice?: number | null } | undefined)?.unitPrice ?? 0,
            );
            return {
              value: quantity * unitPrice,
            };
          },
        },
      }),
    );
}

function createDerivedInvoiceItemTotalAmountFieldFromFormValues(
  formValues: unknown,
) {
  return z
    .number({ coerce: true })
    .int()
    .nonnegative()
    .superRefine(
      fieldConfig({
        inputProps: {
          className: 'border-none',
          readOnly: true,
        },
        customData: {
          derive: ({ rowPath }) => {
            const row = getValueAtPath(formValues, rowPath);
            const quantity = Number(
              (row as { quantity?: number | null } | undefined)?.quantity ?? 0,
            );
            const rate = Number(
              (row as { rate?: number | null } | undefined)?.rate ?? 0,
            );
            return {
              value: quantity * rate,
            };
          },
        },
      }),
    );
}

function createSoftDerivedUnitPriceField({
  priceKey,
}: {
  priceKey: 'sellingPrice' | 'costPrice';
}) {
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

function createPaidAmountFieldFromFormValues(
  formValues: {
    payments?: Array<{ paidAmount?: number | null | string } | null> | null;
  },
) {
  return z
    .number({ coerce: true })
    .default(0)
    .describe('Paid Amount')
    .superRefine(
      fieldConfig({
        fieldType: 'number',
        inputProps: {
          className: 'border-none',
          disabled: true,
        },
        customData: {
          derive: () => ({
            inputProps: {
              value: getPaidAmountFromFormValues(formValues),
            }
          }),
        },
      }),
    );
}

function createDerivedPaymentStatusFieldFromFormValues(
  formValues: {
    items?: Array<{ quantity?: number | null; unitPrice?: number | null } | null> | null;
    payments?: Array<{ paidAmount?: number | null | string } | null> | null;
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

function createSoftDerivedUnitField() {
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
          className: 'border-none',
        },
        customData: withSourceCustomData({
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

export const salesItemSchema = z
  .object({
    product: z
      .string()
      .describe('Product')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            sources: [
              {
                table: 'product',
                displayKeys: ['title', 'stockQuantity'],
                separator: ' - Stock: ',
              },
            ],
          },
        }),
      ),
    unit: createSoftDerivedUnitField(),
    quantity: z
      .number({ coerce: true })
      .int()
      .nonnegative()
      .describe('Quantity')
      .superRefine(
        fieldConfig({
          fieldType: 'number',
        }),
      ),
    unitPrice: z.number({ coerce: true }).positive().describe('Unit Price'),
    totalAmount: z
      .number({ coerce: true })
      .describe('Total Amount'),
  })
  .withDerivation('totalAmount', ({ formValues }) =>
    createDerivedSalesItemTotalAmountFieldFromFormValues(formValues),
  )
  .extend(table);

export const saleSchema = z
  .object({
    customerId: z
      .string()
      .describe('Customer')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            sources: [
              {
                table: 'customer',
                displayKey: 'name',
              },
            ],
          },
        }),
      ),
    saleDate: z
      .string()
      // .datetime()
      .datetime({ offset: true })
      .default(() => new Date().toISOString())
      .describe('Sale Date')
      .superRefine(fieldConfig({ fieldType: 'datetime' })),
    items: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items Sold'),
    totalAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Total Amount'),
    payments: z
      .array(paymentRowSchema)
      .optional()
      .describe('Payments'),
    paidAmount: z.number({ coerce: true }).nonnegative().describe('Paid Amount'),
    paymentStatus: z
      .string()
      .default('pending')
      .describe('Payment Status')
      .superRefine(
        fieldConfig({
          inputProps: {
            className: 'border-none',
            disabled: true,
          },
        }),
      ),
    paymentMethod: z
      .enum(paymentMethods)
      .optional()
      .describe('Payment Method'),
    notes: z
      .string()
      .optional()
      .describe('Notes')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    createDerivedPaymentStatusFieldFromFormValues(formValues),
  )
  .withDerivation('totalAmount', ({ formValues }) =>
    createDerivedTotalAmountFieldFromFormValues(formValues),
  )
  .extend(table)
  .superRefine((sale, ctx) => {
    if (!sale.paidAmount) return;
    const totalCost = getItemsTotalForPaymentStatus(sale.items);
    if (sale.paidAmount > totalCost)
      ctx.addIssue({
        code: 'custom',
        message: `Paid amount cannot be greater than total cost (${totalCost})`,
        path: ['paidAmount'],
      });
  })

export type Sale = z.infer<typeof saleSchema>;

export const orderSchema = z
  .object({
    customerId: z
      .string()
      .describe('Customer')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            sources: [
              {
                table: 'customer',
                displayKey: 'name',
              },
            ],
          },
        }),
      ),
    items: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items Ordered'),
    totalAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Total Amount'),
    payments: z
      .array(paymentRowSchema)
      .optional()
      .describe('Payments'),
    paidAmount: z.number({ coerce: true }).nonnegative().describe('Paid Amount'),
    paymentStatus: z
      .string()
      .default('pending')
      .describe('Payment Status')
      .superRefine(
        fieldConfig({
          inputProps: {
            className: 'border-none',
            disabled: true,
          },
        }),
      ),
    orderStatus: z
      .enum(['pending', 'done', 'cancelled'])
      .default('pending')
      .describe('Order Status')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            disableWhenValueIn: ['done', 'cancelled'],
          },
        }),
      ),
    paymentMethod: z
      .enum(paymentMethods)
      .optional()
      .describe('Payment Method'),
    notes: z
      .string()
      .optional()
      .describe('Notes')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    createDerivedPaymentStatusFieldFromFormValues(formValues),
  )
  .withDerivation('totalAmount', ({ formValues }) =>
    createDerivedTotalAmountFieldFromFormValues(formValues),
  )
  .extend(table)
  .superRefine((order, ctx) => {
    if (!order.paidAmount) return;
    const totalCost = getItemsTotalForPaymentStatus(order.items);
    if (order.paidAmount > totalCost)
      ctx.addIssue({
        code: 'custom',
        message: `Paid amount cannot be greater than total cost (${totalCost})`,
        path: ['paidAmount'],
      });
  })
export const stockImportSchema = z
  .object({
    party: z
      .string()
      .describe('Party')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            sources: [
              {
                table: 'party',
                displayKey: 'name',
              },
            ],
          },
        }),
      ),
    importDate: z
      .string()
      .datetime({ offset: true })
      .default(() => new Date().toISOString())
      .describe('Purchase Date')
      .superRefine(fieldConfig({ fieldType: 'datetime' })),
    items: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'costPrice',
        }),
      })
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items to Purchase'),
    totalAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Total Amount'),
    payments: z
      .array(paymentRowSchema)
      .optional()
      .describe('Payments'),
    paidAmount: z.number({ coerce: true }).nonnegative().describe('Paid Amount'),
    paymentStatus: z
      .string()
      .default('pending')
      .describe('Payment Status')
      .superRefine(
        fieldConfig({
          inputProps: {
            className: 'border-none',
            disabled: true,
          },
        }),
      ),
    notes: z
      .string()
      .optional()
      .describe('Notes')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    createDerivedPaymentStatusFieldFromFormValues(formValues),
  )
  .withDerivation('totalAmount', ({ formValues }) =>
    createDerivedTotalAmountFieldFromFormValues(formValues),
  )
  .extend(table)
  .superRefine((stockImport, ctx) => {
    if (!stockImport.paidAmount) return;
    const totalCost = getItemsTotalForPaymentStatus(stockImport.items);
    if (stockImport.paidAmount > totalCost)
      ctx.addIssue({
        code: 'custom',
        message: `Paid amount cannot be greater than total cost (${totalCost})`,
        path: ['paidAmount'],
      });
  })
  .describe('Purchase');

export type StockImport = z.infer<typeof stockImportSchema>;

export const partySchema = z
  .object({
    name: z.string().min(1).describe('Name of the party'),
    address: z.string().optional().describe('Address of the party'),
    panNumber: z.string().optional().describe('PAN number of the party'),
    phone: z.string().optional().describe('Phone number of the party'),
    creditLimit: z
      .number({ coerce: true })
      .int()
      .positive()
      .optional()
      .describe('Credit limit of the party'),
    paymentTerms: z.string().optional().describe('Payment terms of the party'),
    notes: z
      .string()
      .optional()
      .describe('Notes for the party')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
  })
  .extend(table);

export const customerSchema = partySchema.extend({
});

export const invoiceSchema = z
  .object({
    type: z.enum(['purchase', 'sale']),
    partyId: z.string().describe('Party').optional(),
    issuedAt: z
      .string()
      .datetime({ offset: true })
      .describe('Issued At')
      .optional(),
    dueDate: z
      .string()
      .datetime({ offset: true })
      .describe('Due Date')
      .optional(),

    items: z.array(
      z.object({
        product: z.string().describe('Product'),
        quantity: z.number({ coerce: true }).positive(),
        rate: z.number({ coerce: true }).int().nonnegative(), // paisa
      }).withDerivation('total', ({ formValues }) =>
        createDerivedInvoiceItemTotalAmountFieldFromFormValues(formValues),
      ),
    ),
    subTotal: z.number({ coerce: true }).int().nonnegative(),
    tax: z.number({ coerce: true }).int().nonnegative().default(0),
    totalAmount: z.number({ coerce: true }).nonnegative().describe('Total Amount'),
    payments: z
      .array(paymentRowSchema)
      .optional()
      .describe('Payments'),
    paidAmount: z
      .number({ coerce: true })
      .nonnegative()
      .default(0)
      .describe('Amount Paid'),
    paymentStatus: z
      .string()
      .default('pending')
      .describe('Payment Status')
      .superRefine(
        fieldConfig({
          inputProps: {
            className: 'border-none',
            disabled: true,
          },
        }),
      ),
    fiscalYear: z.string().describe('Fiscal Year'),
    description: z
      .string()
      .optional()
      .describe('Notes')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
    vehicleId: z.string().describe('Vehicle').optional(),
    tripId: z.string().describe('Trip').optional(),
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    createDerivedInvoicePaymentStatusFieldFromFormValues(formValues),
  )
  .withDerivation('subTotal', ({ formValues }) =>
    createDerivedInvoiceSubTotalFieldFromFormValues(formValues),
  )
  .withDerivation('totalAmount', ({ formValues }) =>
    createDerivedInvoiceTotalAmountFieldFromFormValues(formValues),
  )
  .extend(table);

export const tripSchema = z
  .object({
    vehicleId: z
      .string()
      .describe('Vehicle')
      .superRefine(
        fieldConfig({
          fieldType: 'select',
          customData: {
            sources: [
              {
                table: 'vehicle',
                displayKeys: ['name', 'licensePlate'],
                separator: ' (',
                suffix: ')',
              },
            ],
          },
        }),
      ),
    dispatchTime: z
      .string()
      .datetime({ offset: true })
      // .datetime()
      .describe('Dispatch Time')
      .default(() => new Date().toISOString())
      .superRefine(fieldConfig({ fieldType: 'datetime' })),
    returnTime: z
      .string()
      .datetime({ offset: true })
      .describe('Return Time')
      .superRefine(fieldConfig({ fieldType: 'datetime' }))
      .optional(),
    destination: z.string().optional().describe('Destination'),
    products: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .min(1, { message: 'At least one product must be sent on a trip.' })
      .describe('Products Sent on Trip'),
    returnedProducts: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .describe('Products Returned from Trip'),
  })
  .extend(table);
