import z from 'zod';
import { fieldConfig, withSourceCustomData } from '@/components/ui/autoform';
import {
  getItemsTotalForPaymentStatus,
  getPaymentStatusFromTotals,
} from '@/config/payment-status-derivation';
import { deriveUnitPrice } from '@/config/unit-price-derivation';
import { isNonNullable } from '../utils';
import type { InferredTable } from './core/types';
import { table } from './listings';

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
    explicitUnitRaw === null ||
      explicitUnitRaw === undefined ||
      explicitUnitRaw === ''
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
              },
            };
          },
        }),
      }),
    );
}

function createPaidAmountFieldFromFormValues(formValues: {
  payments?: Array<{ paidAmount?: number | null | string } | null> | null;
}) {
  return z
    .number({ coerce: true })
    .default(0)
    .describe('Paid Amount')
    .superRefine(
      fieldConfig({
        fieldType: 'number',
        inputProps: {
          className: 'border-none',
          readOnly: true,
        },
        customData: {
          derive: () => ({
            inputProps: {
              value: getPaidAmountFromFormValues(formValues),
            },
          }),
        },
      }),
    );
}

function createDerivedPaymentStatusFieldFromFormValues(formValues: {
  items?: Array<{
    quantity?: number | null;
    unitPrice?: number | null;
  } | null> | null;
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
            const totalCost = getItemsTotalForPaymentStatus(
              formValues.items ?? [],
            );
            const paidAmount = getPaidAmountFromFormValues(formValues);
            return {
              inputProps: {
                value: getPaymentStatusFromTotals({
                  paidAmount,
                  totalAmount: totalCost,
                }),
              },
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
      .describe('Total Amount')
      .superRefine(
        fieldConfig({
          inputProps: {
            className: 'border-none',
            readOnly: true,
          },
          customData: {
            derive: ({ formValues, rowPath }) => {
              const row = getValueAtPath(formValues, rowPath);
              const quantity = Number(
                (row as { quantity?: number | null } | undefined)?.quantity ??
                0,
              );
              const unitPrice = Number(
                (row as { unitPrice?: number | null } | undefined)?.unitPrice ??
                0,
              );
              return {
                value: quantity * unitPrice,
              };
            },
          },
        }),
      ),
  })
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
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items Sold'),
    payments: z
      .array(
        z.object({
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
        }),
      )
      .default([])
      .describe('Payments'),
    paidAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Paid Amount'),
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
      .enum(['cash', 'card', 'bankTransfer', 'credit'])
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
  });

export type Sale = z.infer<typeof saleSchema>;

export type SalesItem = NonNullable<InferredTable<'sale'>['items']>[number];

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
    payments: z
      .array(
        z.object({
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
        }),
      )
      .default([])
      .describe('Payments'),
    paidAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Paid Amount'),
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
      .enum(['cash', 'card', 'bankTransfer', 'credit'])
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
  });

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
      .describe('Import Date')
      .superRefine(fieldConfig({ fieldType: 'datetime' })),
    items: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'costPrice',
        }),
      })
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items to Import'),
    totalAmount: z.number(),
    payments: z
      .array(
        z.object({
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
        }),
      )
      .default([])
      .describe('Payments'),
    paidAmount: z
      .number({ coerce: true })
      .nonnegative()
      .describe('Paid Amount'),
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
  .withDerivation('totalAmount', ({ formValues }) => {
    return z
      .number({ coerce: true })
      .describe('Total Amount')
      .superRefine(
        fieldConfig({
          inputProps: {
            placeholder: 'Select a product first',
            className: 'border-none',
            readOnly: true,
          },
          customData: {
            derive: () => {
              return {
                inputProps: {
                  value: formValues.items?.reduce((sum, item) => sum + (item?.quantity ?? 0) * (item?.unitPrice ?? 0), 0)
                },
              };
            },
          },
        }),
      );
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    createDerivedPaymentStatusFieldFromFormValues(formValues),
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
  .describe('Stock Import');

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

export const customerSchema = partySchema.extend({});

export const invoiceSchema = z
  .object({
    type: z.enum(['purchase', 'sale']),
    partyId: z.string().describe('Party').optional(),
    vehicleId: z.string().describe('Vehicle').optional(),
    tripId: z.string().describe('Trip').optional(),
    description: z
      .string()
      .optional()
      .superRefine(fieldConfig({ fieldType: 'richText' })),
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
        total: z.number({ coerce: true }).int().nonnegative(),
      }),
    ),

    subTotal: z.number({ coerce: true }).int().nonnegative(),
    tax: z.number({ coerce: true }).int().nonnegative().default(0),
    payments: z
      .array(
        z.object({
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
        }),
      )
      .default([])
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
  })
  .withDerivation('paidAmount', ({ formValues }) =>
    createPaidAmountFieldFromFormValues(formValues),
  )
  .withDerivation('paymentStatus', ({ formValues }) =>
    z
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
              const paidAmount = getPaidAmountFromFormValues(formValues);
              return {
                inputProps: {
                  value: getPaymentStatusFromTotals({
                    paidAmount,
                    totalAmount: subTotal + tax,
                  }),
                },
              };
            },
          },
        }),
      ),
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
      .describe('Products Sent on Trip'),
    returnedProducts: salesItemSchema
      .extend({
        unitPrice: createSoftDerivedUnitPriceField({
          priceKey: 'sellingPrice',
        }),
      })
      .array()
      .optional()
      .describe('Products Returned from Trip'),
  })
  .extend(table);
