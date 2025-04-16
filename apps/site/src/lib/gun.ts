import GUN from "gun/gun"
import "gun/sea"
import "gun/axe"

export const gun = GUN({
    peers: ["wss://gun-relay.abhi-shake-np.workers.dev/gun", "wss://gun-manhattan.herokuapp.com/gun"],
})