import type { GunMessagePut } from 'gun';
import type { SchemaKeys, UpdaterParams } from '..';
import { mergeOptionsWithDefaults } from '../options';
import { getGunRef, getNestedZodShape, mergeKeys } from '../utils';
import { encrypt } from '../utils/sea';
import _ from 'lodash';

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

function omitEmptyObject<T>(value: T): T {
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
        .put(omitEmptyObject(omitMeta(encrypted)), (ack) => {
          if ('err' in ack && !!ack.err) {
            reject(ack.err);
          } else {
            resolve(ack);
          }
        });
    });
  };
}
