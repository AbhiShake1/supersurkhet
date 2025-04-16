import { z } from "zod";

const table = {
    created_by: z.string(),
    timestamp: z.number(),
    _: z.object({
        soul: z.string(),
    }).optional(),
}

export const appSchema = z.object({
    user: z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
    }).extend(table),
    inventory: z.object({
        id: z.string().uuid().describe("Unique identifier for the inventory item"),
        name: z.string().min(1).describe("Name of the inventory item"),
        description: z.string().optional().describe("Optional description of the item"),
        sku: z.string().optional().describe("Stock Keeping Unit (optional identifier)"),
        category: z.string().optional().describe("Category of the item (e.g., 'Electronics', 'Produce', 'Appetizers')"),
        tags: z.array(z.string()).optional().describe("Optional tags for filtering and searching"),
        unitPrice: z.number().positive().describe("Price per unit of the item"),
        currency: z.string().length(3).default("USD").describe("Currency code (e.g., USD, EUR, NPR)"),
        quantityAvailable: z.number().int().nonnegative().describe("Current quantity available in stock"),
        unitOfMeasure: z.string().optional().describe("Unit of measure (e.g., 'piece', 'kg', 'ml', 'serving')"),
        reorderPoint: z.number().int().nonnegative().optional().describe("Minimum quantity before reordering is suggested"),
        supplier: z.string().optional().describe("Name of the supplier"),
        supplierCode: z.string().optional().describe("Supplier's item code"),
        costPrice: z.number().positive().optional().describe("Cost price per unit (for internal tracking)"),
        // Timestamps
        createdAt: z.date().default(() => new Date()).describe("Date and time when the item was created"),
        updatedAt: z.date().default(() => new Date()).describe("Date and time when the item was last updated"),

        // Application-specific fields (can be extended or ignored as needed)
        imageUrl: z.string().url().optional().describe("Optional URL to an image of the item"),
        attributes: z.record(z.string(), z.any()).optional().describe("Optional key-value pairs for additional attributes (e.g., size, color, ingredients)"),
        variants: z.record(z.string().uuid(), z.object({ // Changed from array to record
            name: z.string(),
            sku: z.string().optional(),
            unitPrice: z.number().positive(),
            quantityAvailable: z.number().int().nonnegative(),
            attributes: z.record(z.string(), z.any()).optional(),
            // Add other variant-specific properties as needed
        })).optional().describe("Optional record of variants, where the key is the variant ID"),
        isFeatured: z.boolean().optional().describe("Optional flag to indicate if the item is featured"),
        isActive: z.boolean().default(true).describe("Optional flag to indicate if the item is currently active/available"),
        // Add more application-specific fields as required
    }).extend(table),
    business: z.object({
        school: z.object({
            name: z.string(),
            address: z.string(),
            city: z.string(),
            fee: z.bigint(),
        }).extend(table),
        restaurant: z.object({
            name: z.string(),
            address: z.string(),
            city: z.string(),
            // menu: z.preprocess((val) => {
            //     if (Array.isArray(val)) {
            //         return JSON.stringify(val)
            //     }
            //     return val;
            // }, z.string().transform((val, ctx) => {
            //     try {
            //         const parsed = JSON.parse(val);
            //         if (!Array.isArray(parsed)) throw new Error();
            //         const result = z.array(z.array(
            //             z.object({
            //                 name: z.string(),
            //                 price: z.number(),
            //             }))).safeParse(parsed);
            //         if (!result.success) {
            //             ctx.addIssue({
            //                 code: z.ZodIssueCode.custom,
            //                 message: "Invalid array items",
            //             });
            //             return z.NEVER;
            //         }
            //         return result.data;
            //     } catch {
            //         ctx.addIssue({
            //             code: z.ZodIssueCode.custom,
            //             message: "Invalid JSON string",
            //         });
            //         return z.NEVER;
            //     }
            // })).optional(),
        }).extend(table),
    }),
})
export type AppSchemaShape = typeof appSchema
export type AppSchema = z.infer<AppSchemaShape>

declare global {
    interface GTAAppSchema extends AppSchemaShape { }
}