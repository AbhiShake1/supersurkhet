import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import type { NestedSchemaType, SchemaKeys } from '..';
import { mergeOptionsWithDefaults } from '../options';
import type { GunMessagePut } from 'gun';

export function omitEmptyObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map(omitEmptyObject)
      .filter((v) => !(isPlainObject(v) && Object.keys(v).length === 0)) as T;
  }

  if (isPlainObject(value)) {
    const result: any = {};

    for (const [k, v] of Object.entries(value)) {
      const cleaned = omitEmptyObject(v);

      if (!(isPlainObject(cleaned) && Object.keys(cleaned).length === 0)) {
        result[k] = cleaned;
      }
    }

    return result;
  }

  return value;
}

function isPlainObject(x: unknown): x is Record<string, any> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function create<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  const options = mergeOptionsWithDefaults({});
  const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
  // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
  const schema = getNestedZodShape(key, options.schema!);
  return async (
    value: Omit<NestedSchemaType<T>, '_'> & { id?: string | number },
  ) => {
    const _encrypted = await encrypt(value, schema);
    const encrypted = omitEmptyObject(_encrypted);
    return new Promise<GunMessagePut>((resolve, reject) => {
      getGunRef(keys)
        .get(encrypted?.id ?? `${keys}/${Date.now().toString()}`)
        .put(encrypted, (ack) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
          } else {
            resolve(ack);
          }
        });
    });
  };
}
