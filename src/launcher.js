import Messenger from "/src/messenger";
import { Scanner } from "/src/scanner";
import { BotMaster } from "/src/botmaster";
import { PurchaseAgent } from "/src/purchaseagent";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    let messenger = new Messenger();
    let scanner = new Scanner(ns, messenger);
    let botmaster = new BotMaster(ns, messenger, scanner);
    let purchase_agent = new PurchaseAgent(ns, messenger, scanner, 16);
    while (true) {
        purchase_agent.run(ns);
        await botmaster.refresh(ns);
        await botmaster.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}