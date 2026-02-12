import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import type { NestedSchemaType, SchemaKeys } from '..';
import { mergeOptionsWithDefaults } from '../options';
import type { GunMessagePut } from 'gun';

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
    const encrypted = await encrypt(value, schema);
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
