import { Link as LinkBase } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import z from 'zod';

export const LinkSchema = z.object({
  page: z.string().nullish().default(null).catch(null),
  className: z.string().optional(),
  children: z.custom<ReactNode>().optional(),
  searchParams: z.record(z.string()).optional(),
});

export function Link({
  page,
  searchParams,
  ...props
}: z.infer<typeof LinkSchema>) {
  const hasLegacySearch = page != null || searchParams !== undefined;

  return (
    <LinkBase
      {...props}
      to="."
      search={
        hasLegacySearch
          ? (previous) => ({
              ...previous,
              ...(searchParams ?? {}),
              ...(typeof page === 'string' ? { p: page } : {}),
            })
          : true
      }
    />
  );
}
