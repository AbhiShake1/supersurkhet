import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { NestedSchemaType, SchemaKeys } from '..';
import { attachSouls, type GetBuilder as UseGetBuilder } from '../ssr/get';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { decrypt } from '../utils/sea';
import { createGunHook } from './useGunHook';

export type { UseGetBuilder };

export const useGet = createGunHook((messenger) => {
  return <const T extends SchemaKeys>(
    key:
      | T
      | (UseGetBuilder<T> & {
          key: T;
        }),
    ...restKeys: string[]
  ): UseQueryResult<NestedSchemaType<T>[], Error> => {
    const queryClient = useQueryClient();
    const isSingle = (typeof key !== 'string' && key.single) || false;
    const k = typeof key === 'string' ? key : key.key;
    const queryKey = ['get', key, ...restKeys];
    const schema = getNestedZodShape(k, messenger._options.schema);
    return useQuery({
      ...(typeof key !== 'string' && key.queryOptions),
      queryKey,
      queryFn: async () => {
        const _keys = mergeKeys(k, ...restKeys) as T;
        const keys =
          typeof key !== 'string' && key.separator?.length
            ? _keys.replaceAll('/', key.separator)
            : _keys;

        const node =
          typeof key !== 'string' && key.treatSlugAsAbsolute
            ? messenger._options.gun.get(keys)
            : getGunRef(keys);

        const resolveLinkedRowValue = async (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          val: any,
          depth = 0,
        ): Promise<unknown> => {
          if (depth > 4 || val === null || val === undefined) {
            return val;
          }

          if (Array.isArray(val)) {
            return Promise.all(
              val.map((item) => resolveLinkedRowValue(item, depth + 1)),
            );
          }

          if (typeof val !== 'object') {
            return val;
          }

          const isLinkedReference =
            !Array.isArray(val) &&
            Object.keys(val).length === 1 &&
            typeof val['#'] === 'string';
          if (isLinkedReference) {
            const linkedSoul = val['#'] as string;
            const linkedNode = linkedSoul.includes('/')
              ? getGunRef(linkedSoul)
              : node.get(linkedSoul);

            const linkedValue = await new Promise((resolve) => {
              let settled = false;
              const finish = (next: unknown) => {
                if (settled) return;
                settled = true;
                resolve(next ?? val);
              };
              try {
                linkedNode.once((next) => finish(next));
                setTimeout(() => finish(val), 250);
              } catch {
                finish(val);
              }
            });

            if (linkedValue === val) {
              return val;
            }

            return resolveLinkedRowValue(linkedValue, depth + 1);
          }

          const resolvedEntries = await Promise.all(
            Object.entries(val).map(async ([entryKey, entryValue]) => [
              entryKey,
              await resolveLinkedRowValue(entryValue, depth + 1),
            ]),
          );
          return Object.fromEntries(resolvedEntries);
        };

        async function transform(fullData: unknown) {
          if (!fullData || typeof fullData !== 'object') return [];

          const entries = Object.entries(fullData) as Array<[string, unknown]>;
          const newList: NestedSchemaType<T>[] = [];

          if (isSingle) {
            const decrypted = await decrypt<NestedSchemaType<T>>(
              (await resolveLinkedRowValue(fullData)) as NestedSchemaType<T>,
              schema,
            );
            if (decrypted) {
              const item = attachSouls(decrypted, keys);
              newList.push(item);
            }
          } else {
            for (const [soul, val] of entries) {
              if (soul === '_' || val === null) continue;
              const rowValue = await resolveLinkedRowValue(val);

              const decrypted = await decrypt<NestedSchemaType<T>>(
                {
                  // `open()` can surface row references (`{ '#': soul }`) instead of payloads.
                  // Dereference first so consumers receive the full row consistently.
                  ...(rowValue as Record<string, unknown>),
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
            queryClient.setQueryData(queryKey, (current) => {
              const currentList = Array.isArray(current) ? current : [];
              const nextList = Array.isArray(newList) ? newList : [];
              if (nextList.length === 0 && currentList.length > 0) {
                return currentList;
              }
              return nextList;
            });
          })
          .then();

        return (queryClient.getQueryData(queryKey) ??
          (await transform(firstData)) ??
          []) as NestedSchemaType<T>[];
      },
    });
  };
});

type Options<T extends SchemaKeys> = UseQueryOptions<
  NestedSchemaType<T>[],
  Error,
  UseGetBuilder<T>
>;

export type UseGetOptions<T extends SchemaKeys> = Omit<
  Options<T>,
  'queryFn'
> & {
  key: T;
};

export type UseGetOptionsShort = Omit<UseGetOptions<SchemaKeys>, 'key'> & {
  key?: string;
};

export type UseGet = typeof useGet;
