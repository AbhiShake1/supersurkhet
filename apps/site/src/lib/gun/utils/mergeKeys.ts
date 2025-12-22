import { gun } from "@/lib/gun";

export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
  const env = "LOCAL"
  const initialKeys = key?.length ? key.split("/") : [];
  const nonNamespacedKey = initialKeys.concat(restKeys).filter(Boolean).join("/");
  return `root/${env}/${nonNamespacedKey}`;
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
