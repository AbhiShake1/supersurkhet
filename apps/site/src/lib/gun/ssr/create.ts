import type { GunMessagePut } from 'gun';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import type { NestedSchemaType, SchemaKeys } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import { omitUndefined } from '@/lib/utils/undefined-to-null';

export function create<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  const options = mergeOptionsWithDefaults({});
  if (!options.schema) {
    throw new Error('Default schema not set for create runtime');
  }
  const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
  const schema = getNestedZodShape(key, options.schema);
  return async (
    value: Omit<NestedSchemaType<T>, '_'> & { id?: string | number },
  ) => {
    const businessId = restKeys[0];
    await runLifecycleHookPipeline({
      businessId,
      table: key,
      hook: 'beforeCreate',
      payload: value,
    });

    const _encrypted = await encrypt(value, schema);
    const encrypted = omitUndefined(_encrypted)
    return new Promise<GunMessagePut>((resolve, reject) => {
      getGunRef(keys)
        .get(encrypted?.id ?? `${keys}/${Date.now().toString()}`)
        .put(encrypted, (ack) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
          } else {
            void runLifecycleHookPipeline({
              businessId,
              table: key,
              hook: 'afterCreate',
              payload: value,
            })
              .then(() => resolve(ack))
              .catch(reject);
          }
        });
    });
  };
}
