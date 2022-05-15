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
        const nextUpgrade = this.get_next_upgrade(ns)

        const numNodes = ns.hacknet.numNodes();
        const belowMaxNodes = numNodes < ns.hacknet.maxNumNodes() ? true : false;
        const nextNodeCost = ns.hacknet.getPurchaseNodeCost()
        let message
        if (belowMaxNodes && nextNodeCost < nextUpgrade.cost) {
            if (nextNodeCost < ns.getServerMoneyAvailable("home")) {
                message = `  Purchasing additional Hacknet Server!`
                this.messenger.append_message('HackNet Upgrade Purchased', message)
                ns.hacknet.purchaseNode()
            } else {
                message = `  Waiting to purchase HacknetServer. Cost: $${Utils.pretty_num(nextNodeCost)}`
                this.messenger.add_message('HackNet Next Upgrade', message)
            }
        } else {
            if (nextUpgrade.cost < ns.getServerMoneyAvailable("home")) {
                message = `  Upgrading Hacknet Server ${nextUpgrade.server}: ${nextUpgrade.type}`
                this.messenger.append_message('HackNet Upgrade Purchased', message)
                nextUpgrade.upgradeFunction(nextUpgrade.server, 1)
            } else {
                message = `  Waiting to purchase ${nextUpgrade.type} upgrade for node ${nextUpgrade.server}. Cost: $${Utils.pretty_num(nextUpgrade.cost)}`
                this.messenger.add_message('HackNet Next Upgrade', message)
            }
        }
    }

    get_next_upgrade(ns) {
        const hacknetFunctions = [
            { name: 'level', cost: ns.hacknet.getLevelUpgradeCost, upgrade: ns.hacknet.upgradeLevel },
            { name: 'ram', cost: ns.hacknet.getRamUpgradeCost, upgrade: ns.hacknet.upgradeRam },
            { name: 'cores', cost: ns.hacknet.getCoreUpgradeCost, upgrade: ns.hacknet.upgradeCore },
            { name: 'cache', cost: ns.hacknet.getCacheUpgradeCost, upgrade: ns.hacknet.upgradeCache }
        ]
        let nextUpgrade = { server: 'none', gain: 0, cost: 0 }
        const numNodes = ns.hacknet.numNodes();
        for (let i = 0; i < numNodes; i++) {
            let nodeStats = ns.hacknet.getNodeStats(i)
            const baseGain = ns.formulas.hacknetServers.hashGainRate(nodeStats.level, 0, nodeStats.ram, nodeStats.cores)
            for (const hacknetFunction of hacknetFunctions) {
                nodeStats[hacknetFunction.name] += 1
                const upgradeGain = ns.formulas.hacknetServers.hashGainRate(nodeStats.level, 0, nodeStats.ram, nodeStats.cores)
                const netGain = upgradeGain - baseGain
                const upgradeCost = hacknetFunction.cost(i, 1)
                const unitGain = netGain / upgradeCost
                if (unitGain > nextUpgrade.gain) {
                    nextUpgrade = { server: i, type: hacknetFunction.name, gain: unitGain, cost: upgradeCost, upgradeFunction: hacknetFunction.upgrade }
                }
            }
        }
        const message = `Next Upgrade:  ${JSON.stringify(nextUpgrade)}`
        ns.print(message)
        return nextUpgrade
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
    const verbose = true
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