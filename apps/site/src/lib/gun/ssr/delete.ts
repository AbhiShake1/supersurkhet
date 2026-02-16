import type { GunMessagePut } from 'gun';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import type { SchemaKeys } from '..';
import { getGunRef, mergeKeys } from '../utils';

export function remove<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  return async (id: string) => {
    const businessId = restKeys[0];
    await runLifecycleHookPipeline({
      businessId,
      table: key,
      hook: 'beforeDelete',
      payload: { id },
    });

    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    return new Promise<{ deleted: true; id: string }>((resolve, reject) => {
      getGunRef(keys)
        .get(id)
        .put(null, (ack: GunMessagePut) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
            return;
          }
          void runLifecycleHookPipeline({
            businessId,
            table: key,
            hook: 'afterDelete',
            payload: { id },
          })
            .then(() => resolve({ deleted: true, id }))
            .catch(reject);
        });
    });
  };
}
