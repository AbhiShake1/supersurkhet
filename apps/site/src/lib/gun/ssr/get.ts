import type { QueryObserverOptions } from '@tanstack/react-query';
import type {
  HydratedNestedSchemaType,
  NestedSchemaType,
  SchemaKeys,
} from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { decrypt } from '../utils/sea';

export type GetResultType<T extends SchemaKeys> = HydratedNestedSchemaType<T>;

export type GetBuilder<T extends SchemaKeys> = {
  separator?: string;
  filter?: (item: GetResultType<T>) => boolean;
  single?: boolean;
  queryOptions?: Omit<
    QueryObserverOptions<GetResultType<T>[]>,
    'queryKey' | 'queryFn'
  >;
  treatSlugAsAbsolute?: boolean;
};

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function attachSouls(value: any, currentPath: string): any {
  // primitives stay untouched
  if (typeof value !== 'object' || value === null) return value;

  // ------------------------------------------------------------
  // CASE: ARRAY
  // ------------------------------------------------------------
  if (Array.isArray(value)) {
    const result = value.map((item, index) =>
      attachSouls(item, `${currentPath}/${index}`),
    );

    // give the array itself a soul too
    return Object.assign([...result], { '#': currentPath });
  }

  // ------------------------------------------------------------
  // CASE: OBJECT
  // ------------------------------------------------------------
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const result: Record<string, any> = { '#': currentPath };

  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'object' && val !== null) {
      result[key] = attachSouls(val, `${currentPath}/${key}`);
    } else {
      result[key] = val;
    }
  }

  return result;
}

export function get<const T extends SchemaKeys>(
  key:
    | T
    | (GetBuilder<T> & {
        key: T;
      }),
  ...restKeys: string[]
) {
  const options = mergeOptionsWithDefaults({});
  const isSingle = (typeof key !== 'string' && key.single) || false;
  const k = typeof key === 'string' ? key : key.key;
  // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
  const schema = getNestedZodShape(k, options.schema!);
  const _keys = mergeKeys(k, ...restKeys) as T;
  const keys =
    typeof key !== 'string' && key.separator?.length
      ? _keys.replaceAll('/', key.separator)
      : _keys;

  return new Promise<GetResultType<T>[]>((resolve) => {
    const node = getGunRef(keys);

    node.load(async (data) => {
      if (!data || typeof data !== 'object') return;

      if (isSingle) {
        const decrypted = await decrypt<NestedSchemaType<T>>(data, schema);
        if (decrypted) {
          const item = attachSouls(decrypted, keys);
          resolve([item as GetResultType<T>]);
        }
      } else {
        const items: GetResultType<T>[] = [];
        for (const [soul, val] of Object.entries(data)) {
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
            items.push(item as GetResultType<T>);
          }
        }
        resolve(items);
      }
    });
  });
}
