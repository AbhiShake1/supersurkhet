import { z } from 'zod';
import { fieldConfig } from '@/components/ui/autoform';
import '@/lib/zod/with-derivations';
import { table } from './listings';

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
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
    unit: z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(
        fieldConfig({
          fieldType: 'unit',
          inputProps: {
            disabled: false,
            placeholder: 'Select unit for sale',
          },
        }),
      ),
    quantity: z.number({ coerce: true }).int().positive().describe('Quantity'),
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
      ),
  })
  .extend(table);

export type SalesItem = z.infer<typeof salesItemSchema>;

export const customerIdSchema: z.ZodEffects<z.ZodString> = z
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
  );

export const saleSchema = z
  .object({
    customerId: customerIdSchema,
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
    paidAmount: z.number({ coerce: true }).positive().describe('Paid Amount'),
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
  .extend(table);

export type Sale = z.infer<typeof saleSchema>;

const partySchema: z.ZodEffects<z.ZodString> = z
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
  );

export const stockImportSchema = z
  .object({
    party: partySchema,
    importDate: z
      .string()
      .datetime({ offset: true })
      .default(() => new Date().toISOString())
      .describe('Import Date')
      .superRefine(fieldConfig({ fieldType: 'datetime' })),
    items: salesItemSchema
      .array()
      .min(1, { message: 'Please add at least one item.' })
      .describe('Items'),
    paidAmount: z.number({ coerce: true }).positive().describe('Paid Amount'),
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
  .extend(table)
  .describe('Stock Import');

export type StockImport = z.infer<typeof stockImportSchema>;
