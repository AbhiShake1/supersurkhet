import { type UseMutationOptions, useMutation } from '@tanstack/react-query';
import type { GunMessagePut } from 'gun/types';
import type { NestedSchemaType, SchemaKeys } from '..';
import { update } from '../ssr/update';
import { createGunHook } from './useGunHook';

export type UpdaterParams<T extends SchemaKeys> = { id: string } & Partial<
  Omit<NestedSchemaType<T>, '_' | 'id'>
>;

export const useUpdate = createGunHook(() => {
  return <const T extends SchemaKeys>(opts: UseUpdateOptions<T>) => {
    const [key, ...keys] = opts.keys;
    return useMutation({
      ...opts,
      mutationFn: update(key, ...keys),
    });
  };
});

type Options<T extends SchemaKeys> = UseMutationOptions<
  GunMessagePut,
  Error,
  UpdaterParams<T>,
  unknown
>;

export type UseUpdateOptions<T extends SchemaKeys> = Omit<
  Options<T>,
  'mutationFn'
> & { keys: [T, ...string[]] };

export type UseUpdateOptionsShort = Omit<
  UseUpdateOptions<SchemaKeys>,
  'keys'
> & { keys?: string[] };
