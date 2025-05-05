import "gun/axe";
import GUN from "gun/gun";
// import "gun/lib/radisk";
import "gun/lib/rindexed";
// import "gun/lib/store";
import "gun/lib/webrtc";
import "gun/sea";

export const gun = GUN({
	localStorage: false,
	peers: [
		"wss://gun-relay.abhi-shake-np.workers.dev/gun",
		"wss://gun-manhattan.herokuapp.com/gun",
	],
});
