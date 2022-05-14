import Utils from 'src/utils'
import Messenger from "/src/messenger";

export class HackNetManager {
    constructor(messenger) {
        this.messenger = messenger;
        this.finished = false;
        this.hashThreshold = 0.7
    }

    async init(ns) {

    }

    async run(ns) {
        this.upgrade_hacknet(ns);
        this.spend_hashes(ns);
    }

    finish(ns) {

    }

    upgrade_hacknet(ns) {
        const hacknetFunctions = [
            { name: 'Level', cost: ns.hacknet.getLevelUpgradeCost, upgrade: ns.hacknet.upgradeLevel },
            { name: 'RAM', cost: ns.hacknet.getRamUpgradeCost, upgrade: ns.hacknet.upgradeRam },
            { name: 'Cores', cost: ns.hacknet.getCoreUpgradeCost, upgrade: ns.hacknet.upgradeCore },
            { name: 'Cache', cost: ns.hacknet.getCacheUpgradeCost, upgrade: ns.hacknet.upgradeCache }
        ]

        const numNodes = ns.hacknet.numNodes();
        for (let i = 0; i < numNodes; i++) {
            for (const hacknetFunction of hacknetFunctions) {
                if (hacknetFunction.cost(i, 1) < ns.getServerMoneyAvailable("home")) {
                    ns.print(`Upgrading Hacknet Server ${i} - ${hacknetFunction.name}`)
                    hacknetFunction.upgrade(i, 1)
                    return
                }
            }
        }

        if (numNodes < ns.hacknet.maxNumNodes() &&
            ns.hacknet.getPurchaseNodeCost() < ns.getServerMoneyAvailable("home")) {
            ns.print(`Purchasing additional Hacknet Server!`)
            ns.hacknet.purchaseNode()
        }
    }

    spend_hashes(ns) {
        const desiredUpgrades = ["Exchange for Bladeburner Rank", "Exchange for Bladeburner SP"]
        const currentHashes = ns.hacknet.numHashes();

        for (const upgrade of desiredUpgrades) {
            const currentHashes = ns.hacknet.numHashes();
            if (currentHashes > ns.hacknet.hashCost(upgrade)) {
                ns.tprint(`Using hashes: ${upgrade}.`)
                ns.hacknet.spendHashes(upgrade)
                return
            }
        }

        const maxHashes = ns.hacknet.hashCapacity();
        if (currentHashes / maxHashes > this.hashThreshold) {
            ns.print(`Using hashes: Sell for Money.`)
            ns.hacknet.spendHashes("Sell for Money")
        }
    }

}



/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const verbose = false
    const messenger = new Messenger(verbose);
    messenger.init(ns);
    const hackNetManager = new HackNetManager(messenger)
    await hackNetManager.init(ns);
    while (!hackNetManager.finished) {
        await hackNetManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    hackNetManager.finish(ns)
}

export default HackNetManager;