import { Messenger } from "/src/messenger.js";
import { CorpRunner } from "/src/corprunner.js";

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger(ns);
    let corprunner = new CorpRunner(ns, messenger);
    let loop = true
    while (loop) {
        corprunner.run(ns);
        await ns.sleep(1000);
        loop = true;
    }
}