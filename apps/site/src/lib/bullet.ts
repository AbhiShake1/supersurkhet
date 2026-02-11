import type { GunSchema, IGunChain, IGunInstanceRoot } from 'gun';

function isObject(x: unknown): x is object {
  return (typeof x === 'object' && x !== null) || typeof x === 'function';
}

// ✅ Extension-aware chain type
export type BulletChain<S extends GunSchema, TExt extends object> = IGunChain<
  S,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  any
> &
  TExt &
  (S extends Record<string, GunSchema>
    ? { [K in keyof S]: BulletChain<S[K], TExt> }
    // biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
    : {});

// ✅ Extension-aware props
export type BulletPropsDeep<
  TNode extends Record<string, GunSchema>,
  TExt extends object,
> = {
  [K in keyof TNode]: BulletChain<TNode[K], TExt>;
};

export interface BulletExtensible<
  TNode extends Record<string, GunSchema>,
  TGunInstance,
  TExt extends object,
> {
  extend<
    E extends object,
    ThisRef extends BulletRoot<TNode, TGunInstance, TExt>,
  >(
    this: ThisRef,
    ext: (thisRef: ThisRef) => E,
  ): BulletRoot<TNode, TGunInstance, TExt & E>;
}

export type BulletRoot<
  TNode extends Record<string, GunSchema>,
  TGunInstance,
  TExt extends object,
> = TGunInstance &
  BulletPropsDeep<TNode, TExt> &
  TExt &
  BulletExtensible<TNode, TGunInstance, TExt> & { keys: string[] };

export default function createBullet<
  const TNode extends Record<string, GunSchema>,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const TGunInstance extends IGunInstanceRoot<TNode, any> = IGunInstanceRoot<
    TNode,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    any
  >,
>(gun: TGunInstance) {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const cache = new WeakMap<object, any>();

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const ext: Record<string, any> = Object.create(null);

  function wrap<T extends object>(target: T): T {
    if (!isObject(target)) return target;
    const cached = cache.get(target);
    if (cached) return cached;

    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const proxied = new Proxy(target as any, {
      get(t, prop, receiver) {
        if (typeof prop !== 'string') return Reflect.get(t, prop, receiver);

        if (prop === 'extend') {
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          return <E extends object>(factory: (thisRef: any) => E) => {
            if (typeof factory !== 'function') {
              throw new TypeError(
                'extend(...) expects a function: (thisRef) => extensionObject',
              );
            }
            const produced = factory(receiver);
            if (!produced || typeof produced !== 'object') {
              throw new TypeError('extend(...) factory must return an object');
            }
            Object.assign(ext, produced);
            return receiver;
          };
        }

        if (prop in ext) {
          const v = ext[prop];
          return typeof v === 'function' ? v.bind(receiver) : v;
        }

        if (prop in t) {
          const v = Reflect.get(t, prop, receiver);
          if (typeof v === 'function') {
            // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
            return (...args: any[]) => {
              const out = v.apply(t, args);
              return isObject(out) ? wrap(out) : out;
            };
          }
          return isObject(v) ? wrap(v) : v;
        }

        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        const out = (t as any).get(prop);
        return isObject(out) ? wrap(out) : out;
      },
    });

    cache.set(target, proxied);
    return proxied;
  }

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  // biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
    return wrap(gun as any) as BulletRoot<TNode, TGunInstance, {}>;
}
