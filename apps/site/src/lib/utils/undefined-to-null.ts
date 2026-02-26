import _ from 'lodash';

export function undefinedToNull<T>(value: T): T {
  return _.cloneDeepWith(value, (v) => {
    if (v === undefined) return null;
    return undefined; // let lodash handle recursion
  });
}

export function omitUndefined<T>(value: T): T {
  if (_.isArray(value)) {
    return value.map(omitUndefined) as T;
  }

  if (_.isPlainObject(value)) {
    return _.transform(
      value,
      (result, val, key) => {
        if (val !== undefined) {
          result[key] = omitUndefined(val);
        }
      },
      {} as Record<string, unknown>,
    ) as T;
  }

  return omitEmptyObject(value);
}

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
