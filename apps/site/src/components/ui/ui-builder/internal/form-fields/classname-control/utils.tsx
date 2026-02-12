export function isTailwindClass<T extends readonly string[]>(
  arr: T,
  token: string,
): token is T[number] {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  return arr.includes(token as any);
}

//Helper function to only return specific types from a classname array
export function filterClassnameArray<
  T extends readonly string[],
  U extends readonly T[number][],
>(array: T, types: U): U[number][] {
  return array.filter((item) => types.includes(item)) as U[number][];
}
