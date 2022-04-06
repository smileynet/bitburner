import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";


export class AugManager {
    constructor(messenger, check, cheap) {
        this.messenger = messenger;
        this.check = check;
        this.min_augs_to_buy = 5
        this.max_rep_default = 10000
        this.max_rep = this.max_rep_default
        this.min_augs_for_goals = this.min_augs_to_buy
        this.finished = false;
        this.start_with_affordable = cheap
    }

    init(ns) {
        if (this.check) {
            ns.print(`Updating rep goals!`)
        } else {
            ns.print(`Buying augs! Cheap: ${this.start_with_affordable}`)
        }
    }

    async run(ns) {
        if (this.check) {
            this.finished = true;
            //AugDisplayer.by_price(ns, AugHelper.get_affordable_augs(ns))
            await this.set_faction_goals(ns)
        } else {
            await ns.write('money.txt', 'true', 'w');
            this.buy_augs(ns)
        }
    }

    async finish(ns) {
        if (!this.check) {
            const num_augs = ns.getOwnedAugmentations(true).length - ns.getOwnedAugmentations(false).length
            if (num_augs >= 5) {
                await ns.write('last_reboot.txt', new Date().toLocaleString() + '\n', 'a')
                ns.installAugmentations('init.js')
            } else {
                ns.tprint(`Exiting without install. ${num_augs} ready to install.`)
            }
        }
    }

    async set_faction_goals(ns) {
        let [all_augs, goals] = this.get_faction_goals(ns)
        while (all_augs.length < this.min_augs_for_goals) {
            this.max_rep = this.max_rep * 1.3
            this.check_rep_ceiling(ns)
            ns.print(`Fewer than ${this.min_augs_for_goals} augs found: ${all_augs.length}, trying again with ${this.max_rep} max rep`);
            [all_augs, goals] = this.get_faction_goals(ns);
        }
        let filename = 'faction_goals.txt'
        await ns.write(filename, JSON.stringify(goals), 'w');
        ns.print(`Goals written to ${filename} with ${goals.length} goals totaling ${all_augs.length} augs.`)
        const affordable_augs = AugHelper.get_affordable_augs(ns).length
        filename = 'affordable_augs.txt'
        await ns.write(filename, affordable_augs, 'w');
        ns.print(`Current number of affordable augs: ${affordable_augs}. Written to ${filename}`)
        const purchased_augs = ns.getOwnedAugmentations(true).length - ns.getOwnedAugmentations(false).length
        if (affordable_augs >= this.min_augs_to_buy - purchased_augs) {
            this.finished = false;
            this.check = false;
            this.start_with_affordable = true;
        } else if (all_augs.length >= this.min_augs_to_buy) {
            const reputation_script = '/src/repmanager.js'
            if (!ns.isRunning(reputation_script, 'home')) {
                const result = ns.run(`/src/scriptlauncher.js`, 1, reputation_script)
                ns.tprint(`Tried to launch script ${reputation_script}, result: ${result}`)
            }
        }
    }

    check_rep_ceiling(ns) {
        const rep_ceiling = 1000000000000
        if (this.max_rep > 1000000000000) {
            this.min_augs_for_goals -= 1
            this.max_rep = rep_ceiling - 1
        } // prevent infinity
    }

    get_faction_goals(ns, max_rep = this.max_rep) {
        const augs_by_faction = AugHelper.get_unowned_augs_by_faction(ns);
        let current_factions = ns.getPlayer().factions
        current_factions = current_factions.filter(faction => faction != 'Bladeburners')
        if (current_factions.length <= 0) {
            ns.tprint(`WARN: No factions found! Are you in any factions? Exiting.`)
            ns.exit()
            return
        }
        let all_augs = [];
        let goals = [];
        for (const faction_augs of augs_by_faction) {
            if (faction_augs.faction == 'Bladeburners') continue // Can't earn rep via contracts with Bladeburners
            for (const aug of faction_augs.augs) {
                if (aug.name == "NeuroFlux Governor" && faction_augs.faction != "CyberSec") {
                    continue
                }
                const faction_favor = ns.getFactionFavor(aug.faction[0])
                const adjusted_max_rep = max_rep * ((100 + faction_favor) / 100)
                if (aug.rep_req <= adjusted_max_rep) {
                    let match = all_augs.find(all_aug => all_aug.name == aug.name)
                    if (match === undefined) {
                        all_augs.push(aug);
                    } else {
                        this.select_best_faction(ns, match, aug)
                    }
                    if (aug.rep_req > 0) goals.push({ name: aug.name, faction: faction_augs.faction, rep: aug.rep_req })
                }
            }
        }
        return [all_augs, goals]
    }

    select_best_faction(ns, current, possible) {
        const factions = [current.faction[0], possible.faction[0]]
        current.faction = [this.get_best_faction(ns, factions)]
    }



    get_next_aug(ns) {
        this.augs_to_buy = AugHelper.get_available_augs(ns);
        if (this.augs_to_buy.length <= 0) {
            ns.tprint(`All available augs purchased, exiting!`)
            this.finished = true;
            return true
        }
        this.augs_to_buy.sort((a, b) => b.price - a.price);
        this.next_aug = this.augs_to_buy.shift();
        if (this.next_aug.name == 'NeuroFlux Governor') return
        while (this.next_aug && this.start_with_affordable &&
            this.next_aug.price > ns.getServerMoneyAvailable('home')) {
            this.next_aug = this.augs_to_buy.shift();
        }
        if (!this.next_aug) {
            ns.tprint(`All available augs purchased, exiting!`)
            this.finished = true;
            return true
        }
    }

    buy_augs(ns) {
        if (!this.augs_to_buy || this.augs_to_buy.length <= 0) {
            if (this.get_next_aug(ns)) return
        }
        if (this.next_aug.price <= ns.getServerMoneyAvailable('home')) {
            this.buy_aug(ns)
        } else {
            if (this.next_aug.name == 'NeuroFlux Governor') {
                ns.tprint(`All available augs purchased, exiting!`)
                this.finished = true;
            } else {
                this.messenger.add_message(`AugManager Update`,
                    `  Next aug to purchase: ${this.next_aug.name}, price: ${Utils.pretty_num(this.next_aug.price)}`);
            }

        }
    }

    buy_aug(ns, aug = this.next_aug) {
        const faction = this.get_best_faction(ns, this.next_aug.faction);
        if (this.meets_aug_prereqs(ns, aug)) {
            const result = ns.purchaseAugmentation(faction, this.next_aug.name)
            ns.tprint(`Aug purchased: ${this.next_aug.name}   price: ${Utils.pretty_num(this.next_aug.price)}   ${result}`)
            this.messenger.append_message(`AugManager Aug Purchased`,
                `  ${this.next_aug.name}   price: ${Utils.pretty_num(this.next_aug.price)}`);
            this.next_aug = this.augs_to_buy.shift()
        } else {
            const index = this.augs_to_buy.findIndex(prereq_aug => prereq_aug.name == aug.prereqs[0]);
            const prereq_aug = this.augs_to_buy[index]
            ns.tprint(`Aug pre-reqs not met for ${aug.name}. Moving prereq ${prereq_aug.name} to the front of the list.`)
            this.augs_to_buy.unshift(aug)
            this.next_aug = prereq_aug
        }
    }

    meets_aug_prereqs(ns, aug) {
        const owned_augs = ns.getOwnedAugmentations(true);
        for (const prereq of aug.prereqs) {
            if (!owned_augs.includes(prereq)) return false
        }
        return true
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

    static get_all_augs(ns) {
        const augs_by_faction = AugHelper.get_all_unowned_augs_by_faction(ns);
        let all_augs = [];
        for (const faction_augs of augs_by_faction) {
            for (const aug of faction_augs.augs) {
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

    static get_all_unowned_augs_by_faction(ns) {
        let current_factions = Utils.factions
        let all_augs = [];
        for (const faction of current_factions) {
            const faction_augs = AugHelper.get_unowned_faction_aug_data(ns, faction)
            all_augs.push({ faction: faction, augs: faction_augs });
        }
        return all_augs
    }

    static get_unowned_augs_by_faction(ns) {
        let current_factions = ns.getPlayer().factions
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

    static city_faction_has_unpurchased_augs(ns, faction) {
        var faction_augs = AugHelper.get_unowned_faction_aug_data(ns, faction);
        if (faction == "Aevum" && faction_augs.length > 3) {
            return true;
        } else if (faction_augs.length > 2) {
            return true;
        } else {
            return false;
        }
    }
}

export class AugDisplayer {
    static by_price(ns) {
        let aug_list = AugHelper.get_affordable_augs(ns);

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
                let line = `    ${key}: ${Utils.pretty_num(value,2)} `
                message += line + `${' '.repeat(45-Math.min(45,line.length))}`
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
    ns.disableLog("ALL");
    const messenger = new Messenger();
    const check = ns.args[0] == 'check' ? true : false;
    const cheap = ns.args[0] == 'cheap' ? true : false;
    const augManager = new AugManager(messenger, check, cheap)
    augManager.init(ns)
    while (!augManager.finished) {
        await augManager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
    await augManager.finish(ns);
}

export default AugManager;