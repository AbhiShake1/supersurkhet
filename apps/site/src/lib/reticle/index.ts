import Gun from "gun/gun";
import { hash } from "./hash";

const SCOPE_FIELD = "\u2316";
let preset = "";

type GunInternals = {
  is(value: unknown): boolean;
  obj: { is(value: unknown): value is Record<string, unknown> };
  on(event: "opt"): { event(handler: (gun: ChainNode) => void): void };
  chain: {
    get: (...args: unknown[]) => unknown;
    key: (...args: unknown[]) => unknown;
    put: (...args: unknown[]) => unknown;
    scope?: (name: string | null) => unknown;
  };
  scope?: (name: string) => typeof Gun;
  text: {
    random: ((length?: number, chars?: string) => string) & { scope: string };
  };
};

type ChainNode = {
  _: Record<string, unknown>;
  __: Record<string, unknown>;
  back: ChainNode;
  chain: () => ChainNode;
};

const gun = Gun as unknown as GunInternals;

function find(chain: unknown, cb: (node: ChainNode) => unknown): unknown {
  let current = chain as ChainNode | undefined;

  if (!gun.is(current)) {
    return undefined;
  }

  while (gun.is(current)) {
    const result = cb(current as ChainNode);
    if (result !== undefined) {
      return result;
    }

    if (current === current?.back) {
      break;
    }

    current = current?.back;
  }

  return undefined;
}

function findScope(instance: ChainNode): string {
  let found = find(instance, (chain) => chain._?.[SCOPE_FIELD]);
  found = typeof found === "string" ? found : instance.__?.[SCOPE_FIELD];
  return typeof found === "string" ? found : "";
}

function prefix(gunChain: ChainNode, name: unknown): unknown {
  if (typeof name === "string") {
    const scope = findScope(gunChain);
    const match = new RegExp(`^${scope}`);
    if (!name.match(match)) {
      return `${scope}${name}`;
    }
    return name;
  }

  if (gun.obj.is(name)) {
    const value = name as Record<string, unknown>;
    if (!value["#"]) {
      return value;
    }
    value["#"] = prefix(gunChain, value["#"]);
    return value;
  }

  return name;
}

gun.scope = (name: string) => {
  preset = typeof name === "string" ? hash(name) : preset;
  return Gun;
};

gun.on("opt").event((instance) => {
  instance.__[SCOPE_FIELD] = (instance.__[SCOPE_FIELD] as string) || preset;
});

gun.chain.scope = function scope(name: string | null) {
  const chain = (this as ChainNode).chain();

  if (typeof name === "string") {
    chain._[SCOPE_FIELD] = hash(name);
  }

  if (name === null) {
    chain._[SCOPE_FIELD] = "";
  }

  return chain;
};

gun.chain.get = ((originalGet) =>
  function get(this: ChainNode, name: unknown, cb?: unknown, opt?: unknown) {
    return originalGet.call(this, prefix(this, name), cb, opt);
  })(gun.chain.get);

gun.chain.key = ((originalKey) =>
  function key(this: ChainNode, name: unknown, cb?: unknown, opt?: unknown) {
    return originalKey.call(this, prefix(this, name), cb, opt);
  })(gun.chain.key);

gun.chain.put = ((originalPut) =>
  function put(this: ChainNode, ...args: unknown[]) {
    gun.text.random.scope = findScope(this);
    return originalPut.apply(this, args);
  })(gun.chain.put);

const scopedRandom = ((originalRandom) =>
  function random(this: unknown, length?: number, chars?: string) {
    return `${gun.text.random.scope}${originalRandom.call(this, length, chars)}`;
  })(gun.text.random) as typeof gun.text.random;

gun.text.random = scopedRandom;

gun.text.random.scope = "";

export default Gun;
