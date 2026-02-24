import type { GunMessagePut } from 'gun';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import { omitUndefined } from '@/lib/utils/undefined-to-null';
import type { NestedSchemaType, SchemaKeys } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import { resolveAfterNextTick, resolveLifecycleBusinessId } from './lifecycle';

export function omitEmptyObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map(omitEmptyObject)
      .filter((v) => !(isPlainObject(v) && Object.keys(v).length === 0)) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};

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

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

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
    const businessId = resolveLifecycleBusinessId({ table: key, restKeys });
    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    const rowId = String(value.id ?? `${keys}/${Date.now().toString()}`);
    if (businessId) {
      await runLifecycleHookPipeline({
        businessId,
        table: key,
        hook: 'beforeCreate',
        payload: value,
        envelope: {
          rowId,
          before: undefined,
          after: value,
          patch: value,
        },
      });
    }

    const _encrypted = await encrypt(value, schema);
    const encrypted = omitEmptyObject(omitUndefined(_encrypted));
    return new Promise<GunMessagePut>((resolve, reject) => {
      const id = encrypted?.id ?? rowId;
      getGunRef(keys)
        .get(id)
        .put(encrypted, (ack) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
          } else {
            if (!businessId) {
              void resolveAfterNextTick(ack).then(resolve);
              return;
            }
            void runLifecycleHookPipeline({
              businessId,
              table: key,
              hook: 'afterCreate',
              payload: value,
              envelope: {
                rowId: String(id),
                before: undefined,
                after: value,
                patch: value,
              },
            })
              .then(() => resolve(ack))
              .catch(reject);
          }
        });
    });
  };
}
