const isServer = typeof window === "undefined";

import "gun/axe";
import GUN from "gun/gun";
import "gun/lib/open";
import "gun/lib/load"
import "gun/lib/radix";
import "gun/lib/radisk";
import "gun/lib/store";
import "gun/lib/rindexed";
import "gun/lib/webrtc";
import "gun/sea";
import "gun/lib/not"
import type { IGunInstance } from "gun/types";

export const gun = GUN({
  localStorage: false,
  radisk: true,
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
