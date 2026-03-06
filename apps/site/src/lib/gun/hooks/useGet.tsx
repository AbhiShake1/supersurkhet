import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { SchemaKeys } from '..';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { createGunHook } from './useGunHook';
import {
  parseNodeData,
  type GetBuilder as UseGetBuilder,
  type GetResultType,
} from '../ssr/get';
import { useEffect, useMemo } from 'react';

export type { UseGetBuilder };

export const useGet = createGunHook((messenger) => {
  return <const T extends SchemaKeys>(
    key:
      | T
      | (UseGetBuilder<T> & {
        key: T;
      }),
    ...restKeys: string[]
  ): UseQueryResult<GetResultType<T>[] | undefined, Error> => {
    const queryClient = useQueryClient();
    const isSingle = (typeof key !== 'string' && key.single) || false;
    const k = typeof key === 'string' ? key : key.key;
    const queryKey = ['get', key, ...restKeys];
    const schema = getNestedZodShape(k, messenger._options.schema as never);
    const _keys = mergeKeys(k, ...restKeys) as T;
    const keys =
      typeof key !== 'string' && key.separator?.length
        ? _keys.replaceAll('/', key.separator)
        : _keys;
    const referenceScopeKeys =
      typeof key !== 'string' && Array.isArray(key.referenceScopeKeys)
        ? key.referenceScopeKeys
        : isSingle && restKeys.length > 1
          ? restKeys.slice(0, -1)
          : [...restKeys];

    const node = useMemo(() => {
      return typeof key !== 'string' && key.treatSlugAsAbsolute
        ? messenger._options.gun.get(keys)
        : getGunRef(keys);
    }, [keys, key])

    useEffect(() => {
      return () => {
        // node.off()
      }
    }, [node])

    return useQuery({
      ...(typeof key !== 'string' && key.queryOptions),
      queryKey,
      queryFn: async () => {
        const firstData = await node
          .open(async (fullData) => {
            const parsed = await parseNodeData<T>({
              table: k as T,
              data: fullData,
              isSingle,
              schema,
              keys,
              referenceScopeKeys,
              schemaRoot: messenger._options.schema,
            });
            const filtered =
              typeof key !== 'string' && key.filter
                ? parsed.filter((item) => key.filter?.(item))
                : parsed;
            queryClient.setQueryData(queryKey, filtered);
          })
          .then();

        const cached = queryClient.getQueryData(queryKey) as
          | GetResultType<T>[]
          | undefined;

        if (cached) return cached;

        const parsed = await parseNodeData<T>({
          table: k as T,
          data: firstData,
          isSingle,
          schema,
          keys,
          referenceScopeKeys,
          schemaRoot: messenger._options.schema,
        });
        return typeof key !== 'string' && key.filter
          ? parsed.filter((item) => key.filter?.(item))
          : parsed;
      },
    }) as UseQueryResult<GetResultType<T>[] | undefined, Error>;
  };
});
export type UseGet = typeof useGet;
