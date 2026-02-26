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
  return <LinkBase {...props} to={page ?? '.'} search={searchParams ?? true} />;
}
