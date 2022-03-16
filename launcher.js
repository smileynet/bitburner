import { Messenger } from "/src/messenger.js";
import { Scanner } from "/src/scanner.js";
import { BotMaster } from "/src/botmaster.js";
import { PurchaseAgent } from "/src/purchaseagent.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    let messenger = new Messenger();
    let scanner = new Scanner(ns);
    let botmaster = new BotMaster(ns, messenger, scanner);
    let purchase_agent = new PurchaseAgent(ns, messenger, scanner, 128);
    while (true) {
        purchase_agent.run(ns);
        await botmaster.refresh(ns);
        await botmaster.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}