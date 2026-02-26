import { type UseMutationOptions, useMutation } from '@tanstack/react-query';
import type { SchemaKeys } from '..';
import { remove } from '../ssr/delete';
import { createGunHook } from './useGunHook';

export const useDelete = createGunHook(() => {
  return <const T extends SchemaKeys>(opts: UseDeleteOptions<T>) => {
    const [key, ...keys] = opts.keys;
    return useMutation({
      ...opts,
      mutationFn: remove(key, ...keys),
    });
  };
});

type Options = UseMutationOptions<
  { deleted: boolean; id: string },
  Error,
  string,
  unknown
>;

export type UseDeleteOptions<T extends SchemaKeys> = Omit<
  Options,
  'mutationFn'
> & { keys: [T, ...string[]] };

export type UseDeleteOptionsShort = Omit<
  UseDeleteOptions<SchemaKeys>,
  'keys'
> & { keys?: string[] };
