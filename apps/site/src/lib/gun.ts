const isServer = typeof window === "undefined";

import "gun/axe";
import GUN from "gun/gun";
import "gun/lib/open";
import "gun/lib/load"
import "gun/lib/radix";
// import "gun/lib/radisk";
// if (!isServer) {
// import("gun/lib/store");
// }
import "gun/lib/webrtc";
import "gun/sea";
import "gun/lib/not"
import "gun/lib/then"
import "gun/lib/unset"
import "./gun/rindexed"
import type { IGunInstance } from "gun/types";

GUN.chain.then = function <F extends (...args: any[]) => any>(cb?: F) {
  var gun = this;
  var p = (new Promise((res, rej) => {
    gun
      .not(() => res([]))
      .once(function (data, key) {
        res(data, key); //call resolve when data is returned
      })
  }))
  return cb ? p.then(cb) : p;
};

export const gun = GUN({
  localStorage: false,
  radisk: false,
  peers: [
    "wss://relay.surkhet.app/gun",
    "wss://gun-manhattan.herokuapp.com/gun",
    "ws://localhost:8787/gun"
  ],
});

if (import.meta.env.DEV && !isServer) {
  window.gun = gun;
}

declare global {
  interface Window {
    gun: IGunInstance;
  }
}
