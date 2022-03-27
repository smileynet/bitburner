import Messenger from "/src/messenger.js";
import FactionManager from './src/factionmanager'


/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    const factionManager = new FactionManager(messenger)
    factionManager.init(ns);
    while (!factionManager.finished) {
        factionManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}