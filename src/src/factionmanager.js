import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";
import { AugHelper } from "/src/augmanager.js"
import { PlayerHelper } from "/src/playermanager.js"

export class FactionManager {
    constructor(ns, messenger) {
        this.messenger = messenger
        this.finished = false;
    }

    init(ns) {
        this.init_faction_data(ns);
        this.handle_city_factions(ns);
    }

    run(ns) {
        this.handle_current_faction(ns)
        this.join_factions(ns);
        this.display_current_target(ns)
    }

    init_faction_data(ns) {
        let faction_data = [{
            faction: 'Tian Di Hui',
            location: 'Chongqing',
            requirements: [
                { type: 'cash', amount: 1000000 },
                { type: 'hacking', amount: 50 }
            ]
        }]

        this.factions_to_join = faction_data
        this.get_next_faction(ns)
    }

    handle_current_faction(ns) {
        let completed = true
        for (const requirement of this.next_faction.requirements) {
            switch (requirement.type) {
                case 'cash':
                    if (ns.getServerMoneyAvailable('home') < requirement.amount) {
                        completed = false;
                    }
                    break;
                case 'hacking':
                    if (ns.getPlayer().hacking < requirement.amount) {
                        completed = false;
                    }
                    break;
                default:
                    ns.tprint(`ERROR: requirement type not recognized`)
                    break;
            }
        }
        if (completed) {
            this.messenger.add_message('FactionManager faction ready to join', `Requirements for joining ${this.next_faction.faction} met. Traveling to ${this.next_faction.location}`)
            this.join_next_faction(ns)
        }
    }

    get_next_faction(ns) {
        if (this.factions_to_join.length > 0) {
            this.next_faction = this.factions_to_join.shift()
            ns.tprint(`Next targeted faction: ${this.next_faction.faction}`)
        } else {
            this.finished = true;
        }
    }

    join_next_faction(ns) {
        const result = PlayerHelper.travel_to(ns, this.next_faction.location);
        if (result == this.next_faction.location) {
            if (ns.getPlayer().factions.includes(this.next_faction.faction)) {
                ns.tprint(`Faction ${this.next_faction.faction} joined! Moving to next faction target.`)
                this.get_next_faction(ns)
            }
        } else {
            ns.tprint(`WARN: Could not travel to ${this.next_faction.location}`)
        }
    }

    display_current_target(ns) {
        let message = ` Currently targeted faction: ${this.next_faction.faction}   Location: ${this.next_faction.location}\n`
        message += `  Requirements:\n`
        for (const requirement of this.next_faction.requirements) {
            message += `    Type ${requirement.type}   Amount: ${requirement.amount}\n`
        }
        message += `\n`
        this.messenger.add_message(`FactionManager update`, message)
    }

    join_factions(ns) {
        const faction_invites = ns.checkFactionInvitations();
        for (const faction of faction_invites) {
            if (Utils.cities.includes(faction)) {
                if (faction != this.next_faction.faction) continue;
            }
            const result = ns.joinFaction(faction);
            ns.tprint(`Faction ${faction} joined. Result ${result}`);
        }
    }

    handle_city_factions(ns) {
        let city_faction = null
        for (const city of Utils.cities) {
            if (AugHelper.city_faction_has_unpurchased_augs(ns, city)) {
                city_faction = {
                    faction: city,
                    location: city,
                    requirements: [
                        { type: 'cash', amount: FactionHelper.get_city_faction_required_cash(city) }
                    ]
                }
                break;
            }
        }
        if (city_faction) {
            ns.tprint(`Next city faction to join: ${city_faction.faction}`)
            this.factions_to_join.push(city_faction)
        }
    }
}

class FactionHelper {
    static get_city_faction_required_cash(next_city_faction) {
        if (next_city_faction == "Sector-12") {
            return 15000000;
        } else if (next_city_faction == "Aevum") {
            return 40000000;
        } else if (next_city_faction == "Volhaven") {
            return 50000000;
        } else if (next_city_faction == "Chongqing") {
            return 20000000;
        } else if (next_city_faction == "New Tokyo") {
            return 20000000;
        } else if (next_city_faction == "Ishima") {
            return 30000000;
        } else {
            ns.print(`ERROR: Unknown city faction!`);
            return false;
        }
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    let messenger = new Messenger();
    let faction_manager = new FactionManager(ns, messenger);
    faction_manager.init(ns)
    while (!faction_manager.finished) {
        await faction_manager.run(ns);
        messenger.run(ns);
        await ns.sleep(1000);
    }
}

export default FactionManager;