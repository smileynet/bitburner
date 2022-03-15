import { BotMaster } from "/src/botmaster.js";

/** @param {NS} ns **/
export async function main(ns) {
    let botmaster = new BotMaster(ns);
    while(true) {
        await botmaster.refresh(ns);
        await botmaster.run(ns);
        await ns.sleep(1000);
    }    
}