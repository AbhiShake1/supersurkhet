import type { GunMessagePut } from 'gun';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import type { SchemaKeys } from '..';
import { getGunRef, mergeKeys } from '../utils';
import { resolveLifecycleBusinessId } from './lifecycle';

export function remove<const T extends SchemaKeys>(
  key: T,
  ...restKeys: string[]
) {
  return async (id: string) => {
    const businessId = resolveLifecycleBusinessId({ table: key, restKeys });
    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    const beforeRow = await new Promise<unknown>((resolve) => {
      getGunRef(keys)
        .get(id)
        .once((row) => resolve(row));
    });
    if (businessId) {
      await runLifecycleHookPipeline({
        businessId,
        table: key,
        hook: 'beforeDelete',
        payload: { id },
        envelope: {
          rowId: id,
          before: beforeRow,
          after: undefined,
          patch: { id },
        },
      });
    }

    return new Promise<{ deleted: true; id: string }>((resolve, reject) => {
      getGunRef(keys)
        .get(id)
        .put(null, (ack: GunMessagePut) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
            return;
          }
          if (!businessId) {
            resolve({ deleted: true, id });
            return;
          }
          void runLifecycleHookPipeline({
            businessId,
            table: key,
            hook: 'afterDelete',
            payload: { id },
            envelope: {
              rowId: id,
              before: beforeRow,
              after: undefined,
              patch: { id },
            },
          })
            .then(() => resolve({ deleted: true, id }))
            .catch(reject);
        });
    });
  };
}
