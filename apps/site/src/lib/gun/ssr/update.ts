import type { GunMessagePut } from 'gun';
import _ from 'lodash';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import type { SchemaKeys, UpdaterParams } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';

function omitMeta<T>(obj: T): T {
  if (!obj) return obj;
  return _.transform(obj, (result, value, key) => {
    if (key === '_') return; // skip this key
    if (_.isArray(value)) {
      result[key] = value.map(omitMeta);
    } else if (_.isPlainObject(value)) {
      result[key] = omitMeta(value);
    } else {
      result[key] = value;
    }
  });
}

export function update<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  const defaultSchema = mergeOptionsWithDefaults({}).schema;
  if (!defaultSchema) {
    throw new Error('Default schema not set for update runtime');
  }
  const schema = getNestedZodShape(key, defaultSchema);
  return async ({ id, ...value }: UpdaterParams<T>) => {
    const businessId = restKeys[0];
    await runLifecycleHookPipeline({
      businessId,
      table: key,
      hook: 'beforeUpdate',
      payload: { id, ...value },
    });

    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    const _encrypted = await encrypt(value, schema);
    const encrypted = Object.fromEntries(
      Object.entries(_encrypted).filter(([, v]) => v !== undefined),
    );
    console.log('update', encrypted);
    return new Promise<GunMessagePut>((resolve, reject) => {
      getGunRef(keys)
        .get(id)
        .put(omitMeta(encrypted), (ack) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
          } else {
            void runLifecycleHookPipeline({
              businessId,
              table: key,
              hook: 'afterUpdate',
              payload: { id, ...value },
            })
              .then(() => resolve(ack))
              .catch(reject);
          }
        });
    });
  };
}
