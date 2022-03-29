import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";

export class AugManager {
    constructor(messenger, buy_augs) {
        this.messenger = messenger;
        this.check = buy_augs;
        this.max_rep_default = 10000
        this.start_with_affordable = false
        this.finished = false;
    }

    async run(ns) {
        if (this.check) {
            this.buy_augs(ns);
        } else {
            AugDisplayer.by_price(ns, AugHelper.get_affordable_augs(ns))
            await this.set_faction_goals(ns)
            this.finished = true;
        }
    }

    async set_faction_goals(ns, max_rep = this.max_rep_default) {
        const augs_by_faction = AugHelper.get_unowned_augs_by_faction(ns);
        let all_augs = [];
        let goals = [];
        for (const faction_augs of augs_by_faction) {
            let faction_rep_level = 0
            for (const aug of faction_augs.augs) {
                if (aug.rep_req > faction_rep_level && aug.rep_req < max_rep) {
                    faction_rep_level = aug.rep_req
                }
            }
            if (faction_rep_level > 0) goals.push({ faction: faction_augs.faction, rep: faction_rep_level })
        }
        if (goals.length <= 0) {
            const new_rep = max_rep * 2
            ns.tprint(`No goals found, trying again with ${new_rep} max rep`)
            await this.set_faction_goals(ns, new_rep)
        } else {
            const filename = 'goals.txt'
            await ns.write(filename, JSON.stringify(goals), 'w');
            ns.tprint(`Goals written to ${filename} with ${goals.length} goals.`)
        }
    }

    get_next_aug(ns) {
        this.augs_to_buy = AugHelper.get_available_augs(ns);
        this.augs_to_buy.sort((a, b) => b.price - a.price);
        this.next_aug = this.augs_to_buy.shift();
        while (this.start_with_affordable &&
            this.next_aug.price > ns.getServerMoneyAvailable('home') &&
            this.next_aug.name != 'NeuroFlux Governor') {
            this.next_aug = this.augs_to_buy.shift();
        }
    }

    buy_augs(ns) {
        if (!this.augs_to_buy || this.augs_to_buy.length <= 0) {
            this.get_next_aug(ns)
        }

        if (this.next_aug.price <= ns.getServerMoneyAvailable('home')) {
            this.buy_aug(ns)
        } else {
            if (this.next_aug.name == 'NeuroFlux Governor') {
                ns.tprint(`All available augs purchased, exiting!`)
                this.finished = true;
            } else {
                this.messenger.add_message(`FactionManager Aug Update`,
                    `  Next aug to purchase: ${this.next_aug.name}, price: ${Utils.pretty_num(this.next_aug.price)}`);
            }

        }
    }

    buy_aug(ns, aug = this.next_aug) {
        const faction = this.get_best_faction(ns, this.next_aug.faction);
        const result = ns.purchaseAugmentation(faction, this.next_aug.name)
        ns.tprint(`Aug purchased: ${this.next_aug.name}   price: ${Utils.pretty_num(this.next_aug.price)}   ${result}`)
        this.messenger.append_message(`FactionManager Aug Purchased`,
            `  ${this.next_aug.name}   price: ${Utils.pretty_num(this.next_aug.price)}`);
        this.next_aug = this.augs_to_buy.shift()
    }

    get_best_faction(ns, factions) {
        let best_rep = 0
        let best_faction = ''
        for (const faction of factions) {
            const faction_rep = ns.getFactionRep(faction)
            if (faction_rep > best_rep) {
                best_faction = faction;
                best_rep = faction_rep;
            }
        }
        return best_faction;
    }
}

export class AugHelper {
    static get_affordable_augs(ns) {
        const all_augs = AugHelper.get_available_augs(ns);
        const current_money = ns.getServerMoneyAvailable("home");
        let affordable_augs = all_augs.filter(aug => aug.price <= current_money);
        return affordable_augs;
    }

    static get_available_augs(ns) {
        const augs_by_faction = AugHelper.get_unowned_augs_by_faction(ns);
        let all_augs = [];
        for (const faction_augs of augs_by_faction) {
            for (const aug of faction_augs.augs) {
                if (!aug.sufficient_rep) continue;
                const index = all_augs.findIndex(list_aug => list_aug.name == aug.name);
                if (index >= 0) {
                    all_augs[index].faction = [...all_augs[index].faction, ...aug.faction];
                } else {
                    all_augs.push(aug)
                }
            }
        }
        return all_augs;
    }

    static get_unowned_augs_by_faction(ns) {
        const current_factions = ns.getPlayer().factions
        let all_augs = [];
        for (const faction of current_factions) {
            const faction_augs = AugHelper.get_unowned_faction_aug_data(ns, faction)
            all_augs.push({ faction: faction, augs: faction_augs });
        }
        return all_augs
    }

    static get_unowned_faction_aug_data(ns, faction) {
        const owned_augs = ns.getOwnedAugmentations(true);
        const faction_augs = ns.getAugmentationsFromFaction(faction)
        const unowned_augs = faction_augs.filter(aug => !owned_augs.includes(aug) || aug == 'NeuroFlux Governor')
        const unowned_aug_data = AugHelper.get_augs_data(ns, unowned_augs, faction);
        return unowned_aug_data;
    }

    static get_augs_data(ns, aug_names, faction = 'none') {
        let augs_data = [];
        aug_names.forEach(aug_name => {
            const aug_data = AugHelper.get_aug_data(ns, aug_name, faction)
            augs_data.push(aug_data)
        })
        return augs_data;
    }

    static get_aug_data(ns, aug_name, faction = 'none') {
        let aug_data = { name: aug_name }
        aug_data.price = ns.getAugmentationPrice(aug_name);
        aug_data.rep_req = ns.getAugmentationRepReq(aug_name);
        aug_data.prereqs = ns.getAugmentationPrereq(aug_name);
        aug_data.stats = ns.getAugmentationStats(aug_name);
        aug_data.faction = [faction];
        aug_data.sufficient_rep = (aug_data.rep_req <= ns.getFactionRep(faction))
        return aug_data;
    }
}

export class AugDisplayer {
    static by_price(ns, aug_list = []) {
        if (aug_list == []) aug_list = AugHelper.get_available_augs(ns);

        aug_list.sort((a, b) => b.price - a.price);

        let message = `Augs by descending price\n`
        for (const aug_data of aug_list) {
            message += `\n  ${aug_data.name}   price: ${Utils.pretty_num(aug_data.price)}\n`
            message += `  Rep required: ${Utils.pretty_num(aug_data.rep_req)}   Sufficient rep: ${aug_data.sufficient_rep}\n`
            message += `  Prereqs: ${aug_data.prereqs}\n`;
            message += `  Factions: ${aug_data.faction}\n`
            message += `  Stats:\n`
            let i = 0;
            for (const [key, value] of Object.entries(aug_data.stats)) {
                let line = `    ${key}: ${value} `
                message += line + `${' '.repeat(45-line.length)}`
                i++;
                if (i % 2 == 0) message += `\n`
            }
            if (i % 2 != 0) message += `\n`
        }
        message += `\nTotal: ${aug_list.length}`;
        ns.tprint(message);
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    const messenger = new Messenger();
    const buy_augs = ns.args[0] == 'check' ? false : true;
    const prompt = ns.args[0] == 'prompt' ? true : false;
    const factionManager = new AugManager(messenger, buy_augs)
    while (!factionManager.finished) {
        await factionManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    if (buy_augs) {
        const num_augs = ns.getOwnedAugmentations(true).length - ns.getOwnedAugmentations(false).length
        let response = true
        if (prompt) {
            response = await ns.prompt(`All available augs purchased. ${num_augs} augs to install.\n\n${' '.repeat(18)}Install now?`)
        }
        if (response) ns.installAugmentations('init.js')
    }
}

export default AugManager;