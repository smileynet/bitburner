import Utils from "/src/utils.js";

export class FactionManager {
    constructor(messenger) {
        this.messenger = messenger;
        this.finished = false;
    }

    init(ns) {

    }

    run(ns) {
        this.join_factions(ns);
        AugDisplayer.by_price(ns, AugHelper.get_affordable_augs(ns));
        this.finished = true;
        // TODO NS.share()?
    }

    join_factions(ns) {
        const faction_invites = ns.checkFactionInvitations();
        for (const faction of faction_invites) {
            if (Utils.cities.includes(faction)) {
                if (!this.should_join_city_faction(ns, faction)) continue;
            }
            const result = ns.joinFaction(faction);
            ns.tprint(`Faction ${faction} joined. Result ${result}`);
        }
    }

    should_join_city_faction(ns, faction) {
        var faction_augs = AugHelper.get_unowned_faction_aug_data(ns, faction);
        if (faction_augs.length > 1) {
            return true;
        } else {
            return false;
        }
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
        const augs_by_faction = AugHelper.get_available_augs_by_faction(ns);
        let all_augs = [];
        for (const faction_augs of augs_by_faction) {
            for (const aug of faction_augs.augs) {
                const index = all_augs.findIndex(list_aug => list_aug == aug.name);
                if (index >= 0) {
                    all_augs[index].faction.concat(aug.faction);
                } else {
                    all_augs.push(aug)
                }
            }
        }
        return all_augs;
    }

    static get_available_augs_by_faction(ns) {
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
        const unowned_augs = faction_augs.filter(aug => !owned_augs.includes(aug))
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
        return aug_data;
    }
}

export class AugDisplayer {
    static by_price(ns, aug_list = []) {
        if (aug_list == []) aug_list = AugHelper.get_available_augs(ns);

        aug_list.sort((a, b) => b.price - a.price);

        let message = `Augs by descending price\n`
        for (const aug_data of aug_list) {
            message += `\n  ${aug_data.name} price: ${Utils.pretty_num(aug_data.price)} rep required: ${Utils.pretty_num(aug_data.rep_req)} prereqs: ${aug_data.prereqs}\n`;
            message += `  Stats:`
            for (const [key, value] of Object.entries(aug_data.stats)) {
                message += `    ${key}: ${value}\n`
            }
        }
        message += `\nTotal: ${aug_list.length}`;
        ns.tprint(message);
    }
}

export default FactionManager;