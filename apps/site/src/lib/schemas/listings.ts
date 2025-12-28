import { z } from "zod";
import { fieldConfig } from "@/components/ui/autoform";

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
    .describe("Created at")
    .superRefine(fieldConfig({ fieldType: "timestamp" }))
    .optional(),
  created_by: z.string().describe("Created by").optional(),
  _: z.object({ soul: z.string().optional() }).optional(),
};
// #endregion

// #region Generalized Listing Schemas (The "Things")

export const baseListingSchema = z
  .object({
    // businessId: z.string().describe("The business this listing belongs to"),
    title: z.string().min(1).describe("Title or name of the listing"),
    description: z.string().optional().describe("Detailed description"),
    price: z
      .number({ coerce: true })
      .positive()
      .describe("Price of the item/service"),
    // currency: z.string().length(3).default("NPR"),
    category: z.string().default("Others").optional(),
    // tags: z.record(z.string(), z.boolean()).optional(),
    imageUrl: z
      .string()
      .describe("Image")
      // .url()
      .superRefine(fieldConfig({ fieldType: "image" }))
      .optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().default(true),
  })
  .extend(table);

export const productSchema = baseListingSchema.extend({
  sku: z.string().optional().describe("Stock Keeping Unit"),
  // quantityAvailable: z.number({ coerce: true }).int().nonnegative().describe("Current quantity in stock"),
  // unitOfMeasure: z.string().optional().describe("e.g., 'piece', 'kg'"),
  imageUrl: z
    .string()
    .describe("Product Image")
    // .url()
    .superRefine(fieldConfig({ fieldType: "image" }))
    .optional(),
  isFeatured: z.boolean({ coerce: true }).optional(),
  isActive: z.boolean({ coerce: true }).default(true),
  price: z
    .number({ coerce: true })
    .positive()
    .describe("Price of the item/service"),
});

export type Product = z.infer<typeof productSchema>;

export const menuItemSchema = productSchema.extend({
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isSpecial: z.boolean().optional(),
  preparationTime: z.number({ coerce: true }).int().positive().optional(),
});

export const propertyListingSchema = baseListingSchema.extend({
  listingType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["land", "house", "apartment", "commercial"]),
  size: z.string().describe("e.g., '1200 sq. ft.' or '5 aana'"),
  amenities: z.record(z.string(), z.boolean()).optional(),
});

export const serviceSchema = baseListingSchema.extend({
  duration: z
    .number({ coerce: true })
    .int()
    .positive()
    .optional()
    .describe("Duration of the service in minutes"),
});

// #endregion
