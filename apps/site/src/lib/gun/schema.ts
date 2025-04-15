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
    interface GTAAppSchema extends AppSchemaShape {}
}