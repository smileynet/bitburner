import Messenger from "/src/messenger.js";
import PlayerManager from './src/playermanager'

class Test {
    constructor() {

    }


    run(ns) {

    }
}

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    const playerManager = new PlayerManager(messenger)
    playerManager.init(ns);
    while (!playerManager.is_finished) {
        playerManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}