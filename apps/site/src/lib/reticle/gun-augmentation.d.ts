import type { IGunInstanceRoot } from 'gun/types';

declare module 'gun/types/gun/IGun' {
  interface IGun {
    scope(name: string): IGun;
  }
}

declare module 'gun/types/gun/IGunChain' {
  interface IGunChain<
    TNode,
    TChainParent,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    TGunInstance extends IGunInstanceRoot<any, any>,
    TKey extends string,
  > {
    scope(
      name: string | null,
    ): IGunChain<TNode, TChainParent, TGunInstance, TKey>;
  }
}
