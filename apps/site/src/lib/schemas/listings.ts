import { z } from 'zod';
import { fieldConfig } from '@/components/ui/autoform';

// #region Core Helpers
const withMeta = <T extends z.ZodTypeAny>(
  schema: T,
  meta: Record<string, unknown>,
) => {
  schema._def.meta = { ...schema._def.meta, ...meta };
  return schema;
};

export const withLabel = <T extends z.ZodTypeAny>(
  schema: T,
  label: string,
  description?: string,
) => {
  return withMeta(schema, { label, description });
};
// #endregion

// #region Base Schema
export const table = {
  timestamp: z
    .number({ coerce: true })
    .describe('Created at')
    .superRefine(fieldConfig({ fieldType: 'timestamp' }))
    .optional(),
  created_by: z.string().describe('Created by').optional(),
  // _: z.object({ soul: z.string() }),
  _: z
    .object({
      soul: z.string().optional(),
      '>': z.record(z.union([z.string(), z.number()])).optional(),
    })
    .optional(),
};
// #endregion

// #region Generalized Listing Schemas (The "Things")

export const baseListingSchema = z
  .object({
    title: z.string().min(1).describe('Product Name'),
    purchasePartyId: z
      .string()
      .min(1, { message: 'Purchase party is required.' })
      .describe('Purchase Party')
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
    hsCode: z.string().min(1).describe('HS Code'),
    unit: z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(fieldConfig({ fieldType: 'unit' })),
    costPrice: z.number({ coerce: true }).positive().describe('Cost Price'),
    sellingPrice: z
      .number({ coerce: true })
      .positive()
      .optional()
      .describe('Default Selling Price')
      .superRefine(fieldConfig({ label: 'Default Selling Price' })),
    barcode: z.string().optional().describe('Barcode'),
    reorderLevel: z
      .number({ coerce: true })
      .int()
      .positive()
      .optional()
      .describe('Reorder Level')
      .superRefine(
        fieldConfig({
          inputProps: {
            placeholder:
              'You will be reminded to reorder this product when only this many is available in stock',
          },
        }),
      ),
    description: z
      .string()
      .optional()
      .describe('Product Description')
      .superRefine(fieldConfig({ fieldType: 'richText' })),
    category: z.string().default('Others').optional(),
    sku: z.string().optional().describe('Stock Keeping Unit'),
    imageUrl: z
      .string()
      .describe('Image')
      .superRefine(fieldConfig({ fieldType: 'image' }))
      .optional(),
    isFeatured: z.boolean({ coerce: true }).optional(),
    isActive: z.boolean({ coerce: true }).default(true),
  })
  .extend(table);

export const productSchema = baseListingSchema.extend({});

export type Product = z.infer<typeof productSchema>;

export const menuItemSchema = productSchema.extend({
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isSpecial: z.boolean().optional(),
  preparationTime: z.number({ coerce: true }).int().positive().optional(),
});

// #endregion
