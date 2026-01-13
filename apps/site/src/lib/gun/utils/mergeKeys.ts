import { gun } from "@/lib/gun";

export const GUN_PREFIX = "root"

const env = process.env.NODE_ENV;

const PREFIX = `${GUN_PREFIX}/${env}/`

export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
  const initialKeys = key?.length ? key.split("/") : [];
  const nonNamespacedKey = initialKeys.concat(restKeys).filter(Boolean).join("/");
  if (nonNamespacedKey.startsWith(PREFIX)) return nonNamespacedKey
  return `${PREFIX}${nonNamespacedKey}`;
}

export function trimKey(key: string) {
  const lastIndexOfPrefix = key.lastIndexOf(PREFIX);
  if (lastIndexOfPrefix === -1) return key;
  return key.slice(lastIndexOfPrefix + PREFIX.length);
}

export function getGunRef(key: string) {
  // const gunRef = gun.get(key);
  const [head, ...tail] = key.split("/");
  let gunRef = gun.get(head);
  for (const k of tail) {
    gunRef = gunRef.get(k);
  }
  return gunRef;
}
