import Utils from "/src/utils.js";
import AugManager from "/src/augmanager.js";

function attempt_donation(ns, faction) {
    const current_money = ns.getServerMoneyAvailable("home")
    const amount = Math.floor(current_money * 0.1)
    const result = ns.donateToFaction(faction, amount)
    let new_rep = ns.getFactionRep(faction) + ns.getPlayer().workRepGained
    if (!result) ns.tprint(`WARN: Buying reputation failed!`)
    ns.tprint(`Buying favor for ${faction}: $${Utils.pretty_num(amount)} New rep: ${Utils.pretty_num(new_rep,2)}`)
}

async function attempt_buy(ns, faction) {
    const owned_augs = ns.getOwnedAugmentations(true);
    const faction_augs = ns.getAugmentationsFromFaction(faction)
    const unowned_augs = faction_augs.filter(aug => !owned_augs.includes(aug) || aug == 'NeuroFlux Governor')
    for (const aug of unowned_augs) {
        if (ns.getAugmentationRepReq(aug) < ns.getFactionRep(faction)) {
            let result = ns.purchaseAugmentation(faction, aug)
            let waiting = false
            while (!result) {
                if (!waiting) {
                    ns.tprint(`Waiting for sufficient cash to purchase ${aug}: $${Utils.pretty_num(ns.getAugmentationPrice(aug))}`)
                    waiting = true;
                }
                await ns.sleep(1000)
                result = ns.purchaseAugmentation(faction, aug)
            }
            ns.tprint(`${aug} purchased: ${result}`)
        }

    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const faction = ns.args[0]
    while (true) {
        await attempt_buy(ns, faction)
        attempt_donation(ns, faction)
        await ns.sleep(1000);
    }
}