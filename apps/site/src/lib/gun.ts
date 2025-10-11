const isServer = typeof window === "undefined";

import "gun/axe";
import GUN from "gun/gun";
import "gun/lib/open";
import "gun/lib/load"
// if (isServer) {
import "gun/lib/radix";
import "gun/lib/radisk";
import "gun/lib/store";
import "gun/lib/rindexed";
// } else {
import "gun/lib/webrtc";
// }
import "gun/sea";
import "gun/lib/not"

export const gun = GUN({
	localStorage: false,
	radisk: false,
	peers: [
		"wss://relay.surkhet.app/gun",
		"wss://gun-manhattan.herokuapp.com/gun",
	],
});

if (import.meta.env.DEV && typeof window !== "undefined") {
	// @ts-expect-error
	window.gun = gun;
}
