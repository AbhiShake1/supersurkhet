import type { GunMessagePut } from 'gun';
import { runLifecycleHookPipeline } from '@/lib/plugins/runtime-pipeline';
import type { SchemaKeys, UpdaterParams } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import { resolveAfterNextTick, resolveLifecycleBusinessId } from './lifecycle';
import { normalizeRowId } from './row-id';

function omitMeta(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => omitMeta(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === undefined) {
      continue;
    }
    if (key === '_' || key === '#') {
      continue;
    }
    result[key] = omitMeta(entryValue);
  }

  return result;
}

export function omitEmptyObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(omitEmptyObject)
      .filter(
        (entry) => !(isPlainObject(entry) && Object.keys(entry).length === 0),
      );
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

async function readExistingRow(
  keys: SchemaKeys,
  id: string | number,
): Promise<unknown> {
  return new Promise((resolve) => {
    getGunRef(keys)
      .get(String(id))
      .once((row) => resolve(omitMeta(row)));
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
    const rowId = normalizeRowId(id, String(key).split('/').pop() || 'row');
    const businessId = resolveLifecycleBusinessId({ table: key, restKeys });
    const keys = mergeKeys(key, ...restKeys) as SchemaKeys;
    const beforeRow = await readExistingRow(keys, rowId);
    if (businessId) {
      await runLifecycleHookPipeline({
        businessId,
        table: key,
        hook: 'beforeUpdate',
        payload: { id, ...value },
        envelope: {
          rowId,
          before: beforeRow,
          after: {
            ...(isPlainObject(beforeRow) ? beforeRow : {}),
            id,
            ...value,
          },
          patch: { id, ...value },
        },
      });
    }

    const _encrypted = await encrypt(value, schema);
    const encrypted = omitMeta(_encrypted);
    return new Promise<GunMessagePut>((resolve, reject) => {
      getGunRef(keys)
        .get(rowId)
        .put(omitEmptyObject(encrypted), (ack) => {
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
              hook: 'afterUpdate',
              payload: { id, ...value },
              envelope: {
                rowId,
                before: beforeRow,
                after: {
                  ...(isPlainObject(beforeRow) ? beforeRow : {}),
                  id,
                  ...value,
                },
                patch: { id, ...value },
              },
            })
              .then(() => resolve(ack))
              .catch(reject);
          }
        });
    });
  };
}
