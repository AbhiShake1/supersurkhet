const isServer = typeof window === 'undefined';

import 'gun/axe';
import Gun from 'gun/gun';
// import "./reticle";
import 'gun/lib/open';
import 'gun/lib/load';
import 'gun/lib/radix';
// import "gun/lib/radisk";
// if (!isServer) {
// import("gun/lib/store");
// }
import 'gun/lib/webrtc';
import 'gun/sea';
import 'gun/lib/not';
import 'gun/lib/then';
import 'gun/lib/unset';
import './gun/rindexed';
import type { IGunInstance } from 'gun/types';

// import createBullet from "./bullet";

const GUN = Gun; //.scope(GUN_PREFIX)

// biome-ignore lint/suspicious/noThenProperty: lint debt cleanup
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
GUN.chain.then = function <F extends (...args: any[]) => any>(cb?: F) {
  var p = new Promise((res, _rej) => {
    this.not(() => res([])).once((data, key) => {
      res(data, key);
    });
  });
  return cb ? p.then(cb) : p;
};

// type ExtratedSchema = {
//   // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
//   [K in keyof BaseAppSchemaType as BaseAppSchemaType[K] extends { schema: any }
//     ? K
//     : never]: BaseAppSchemaType[K] extends { schema: infer S }
//     ? z.infer<S>
//     : never;
// };

export const gun = GUN(
  /*<ExtratedSchema>*/ {
    localStorage: false,
    radisk: isServer,
    peers: [
      'wss://relay.surkhet.app/gun',
      'wss://gun-manhattan.herokuapp.com/gun',
      'ws://localhost:8787/gun',
    ],
  },
);

// export const bullet = createBullet<ExtratedSchema>(gun).extend((thisRef) => ({
//   useGet() {
//     thisRef.extend
//   },
//   get value() {
//     return gun.get("business").then()
//   }
// }));

if (import.meta.env.DEV && !isServer) {
  window.gun = gun;
}

declare global {
  interface Window {
    gun: IGunInstance;
  }
}
