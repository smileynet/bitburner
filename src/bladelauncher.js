import { Messenger } from "/src/messenger.js";
import { BladeBurner } from "/src/bladeburner.js";

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    let bladeburner = new BladeBurner(ns, messenger);
    let loop = true
    while (loop) {
        await bladeburner.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
        loop = true;
    }
}