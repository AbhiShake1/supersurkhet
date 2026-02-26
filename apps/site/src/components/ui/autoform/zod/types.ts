import type { z } from 'zod';

export type ZodObjectOrWrapped = z.AnyZodObject | z.ZodEffects<z.AnyZodObject>;
