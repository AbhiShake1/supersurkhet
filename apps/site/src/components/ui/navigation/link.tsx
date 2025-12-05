import { Link as LinkBase } from "@tanstack/react-router";
import z from "zod";

export const LinkSchema = z.object({
  page: z.string().nullish().default(null).catch(null),
  className: z.string().optional(),
  children: z.any().optional(),
})

export function Link({ page, ...props }: z.infer<typeof LinkSchema>) {
  // @ts-expect-error
  return <LinkBase {...props} search={(prev) => ({ ...prev, p: page })} />
}
