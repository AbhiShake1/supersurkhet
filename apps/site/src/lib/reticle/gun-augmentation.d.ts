import type { IGun, IGunChain, IGunInstanceRoot } from 'gun/types';

declare module 'gun/types/gun/IGun' {
  interface IGun {
    scope(name: string): IGun;
  }
}

declare module 'gun/types/gun/IGunChain' {
  interface IGunChain<
    TNode,
    TChainParent,
    TGunInstance extends IGunInstanceRoot<any, any>,
    TKey extends string,
  > {
    scope(
      name: string | null,
    ): IGunChain<TNode, TChainParent, TGunInstance, TKey>;
  }
}

export {};
