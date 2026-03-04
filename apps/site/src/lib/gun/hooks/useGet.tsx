import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { NestedSchemaType, SchemaKeys } from '..';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { decrypt } from '../utils/sea';
import { createGunHook } from './useGunHook';
import { attachSouls, type GetBuilder as UseGetBuilder } from '../ssr/get';
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
  ): UseQueryResult<NestedSchemaType<T>[] | undefined, Error> => {
    const queryClient = useQueryClient();
    const isSingle = (typeof key !== 'string' && key.single) || false;
    const k = typeof key === 'string' ? key : key.key;
    const queryKey = ['get', key, ...restKeys];
    const schema = getNestedZodShape(k, messenger._options.schema);
    const _keys = mergeKeys(k, ...restKeys) as T;
    const keys =
      typeof key !== 'string' && key.separator?.length
        ? _keys.replaceAll('/', key.separator)
        : _keys;

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
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        async function transform(fullData: any) {
          if (!fullData || typeof fullData !== 'object') return;

          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          const entries = Object.entries(fullData) as [string, any][];
          const newList: NestedSchemaType<T>[] = [];

          if (isSingle) {
            const decrypted = await decrypt<NestedSchemaType<T>>(
              fullData,
              schema,
            );
            if (decrypted) {
              const item = attachSouls(decrypted, keys);
              newList.push(item);
            }
          } else {
            for (const [soul, val] of entries) {
              if (soul === '_' || val === null) continue;

              const decrypted = await decrypt<NestedSchemaType<T>>(
                {
                  ...val,
                  _: { soul },
                },
                schema,
              );

              if (decrypted) {
                const item = attachSouls(decrypted, `${keys}/${soul}`);
                // if (newList.every(i => i._?.soul !== decrypted._?.soul))
                newList.push(item);
              }
            }
          }

          return newList.filter(Boolean);
        }

        const firstData = await node
          .open(async (fullData) => {
            const newList = await transform(fullData);
            queryClient.setQueryData(queryKey, newList);
          })
          .then();

        return (queryClient.getQueryData(queryKey) ??
          (await transform(firstData)) ??
          []) as NestedSchemaType<T>[] | undefined;
      },
    });
  };
});

type Options<T extends SchemaKeys> = UseQueryOptions<
  NestedSchemaType<T>[],
  Error,
  UseGetBuilder<T>
>;

type UseGetOptions<T extends SchemaKeys> = Omit<
  Options<T>,
  'queryFn'
> & {
  key: T;
};
export type UseGet = typeof useGet;
