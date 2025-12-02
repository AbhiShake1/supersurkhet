import { z } from "zod";

export function zStringified<T extends z.ZodTypeAny>(schema: T) {
  return z.string().superRefine((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = schema.safeParse(parsed);

      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          message: "String does not match required JSON shape",
        });
      }
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid JSON string",
      });
    }
  });
}

