export function undefinedToNull<T>(value: Partial<T>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, value]) => [key, value ?? null]),
  ) as Required<T>;
}

export function omitUndefined<T>(value: Partial<T>) {
  return Object.fromEntries(
    Object.entries(value).filter(([_, value]) => value !== undefined),
  ) as Required<T>;
}

