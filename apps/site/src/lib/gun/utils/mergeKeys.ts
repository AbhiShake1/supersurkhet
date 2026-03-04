import { gun } from '@/lib/gun';

const env = process.env.NODE_ENV;

export const GUN_PREFIX = `root/${env}/`;

export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
  const initialKeys = key?.length ? key.split('/') : [];
  const nonNamespacedKey = initialKeys
    .concat(restKeys)
    .filter(Boolean)
    .join('/');
  if (nonNamespacedKey.startsWith(GUN_PREFIX)) return nonNamespacedKey;
  return `${GUN_PREFIX}${nonNamespacedKey}`;
}

export function getGunRef(key: string) {
  // const gunRef = gun.get(key);
  const [head, ...tail] = key.split('/');
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
