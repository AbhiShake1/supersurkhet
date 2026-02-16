import _ from "lodash";

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
      {} as any
    ) as T;
  }

  return value;
}
