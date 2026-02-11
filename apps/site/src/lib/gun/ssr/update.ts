import type { GunMessagePut } from 'gun';
import type { SchemaKeys, UpdaterParams } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';

export function update<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  const schema = getNestedZodShape(key, mergeOptionsWithDefaults({}).schema!);
  return async ({ id, ...value }: UpdaterParams<T>) => {
    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    const _encrypted = await encrypt(value, schema);
    const encrypted = Object.fromEntries(
      Object.entries(_encrypted).filter(([, v]) => v !== undefined),
    );
    return new Promise<GunMessagePut>((resolve, reject) => {
      getGunRef(keys)
        .get(id)
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
