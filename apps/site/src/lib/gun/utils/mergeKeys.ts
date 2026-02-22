import { gun } from '@/lib/gun';

const env = process.env.NODE_ENV;

export const GUN_SEPARATOR = '/';

export const GUN_PREFIX = `root${GUN_SEPARATOR}${env}${GUN_SEPARATOR}`;

export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
  const initialKeys = key?.length ? key.split(GUN_SEPARATOR) : [];
  const nonNamespacedKey = initialKeys
    .concat(restKeys)
    .filter(Boolean)
    .join(GUN_SEPARATOR);
  if (nonNamespacedKey.startsWith(GUN_PREFIX)) return nonNamespacedKey;
  return `${GUN_PREFIX}${nonNamespacedKey}`;
}

export function trimKey(key: string) {
  const lastIndexOfPrefix = key.lastIndexOf(GUN_PREFIX);
  if (lastIndexOfPrefix === -1) return key;
  return key.slice(lastIndexOfPrefix + GUN_PREFIX.length);
}

export function getGunRef(key: string) {
  // const gunRef = gun.get(key);
  const [head, ...tail] = key.split(GUN_SEPARATOR);
  let gunRef = gun.get(head);
  for (const k of tail) {
    gunRef = gunRef.get(k);
  }
  return gunRef;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-expect-error
  window.getGunRef = getGunRef;
}
