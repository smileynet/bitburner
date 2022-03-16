import { PurchaseAgent } from "/src/purchaseagent.js";

/** @param {NS} ns **/
export async function main(ns) {
    let purchase_agent = new PurchaseAgent(ns);
    purchase_agent.run(ns);

}