import { Messenger } from "/src/messenger.js";
import { CorpRunner } from "/src/corprunner.js";

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    let corprunner = new CorpRunner(ns, messenger);
    let loop = true
    while (loop) {
        await corprunner.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
        loop = true;
    }
}