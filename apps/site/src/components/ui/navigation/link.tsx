import { Link as LinkBase } from '@tanstack/react-router';
import z from 'zod';

export const LinkSchema = z.object({
  page: z.string().nullish().default(null).catch(null),
  className: z.string().optional(),
  children: z.any().optional(),
  searchParams: z.record(z.string()).optional(),
});

export function Link({
  page,
  searchParams,
  ...props
}: z.infer<typeof LinkSchema>) {
  // @ts-expect-error
  return (
    <LinkBase
      {...props}
      search={(prev) => ({ ...prev, ...searchParams, p: page })}
    />
  );
}
