import Utils from "/src/utils.js";
import Messenger from "/src/messenger.js";
import { AugHelper } from "/src/augmanager.js"
import { PlayerHelper } from "/src/playermanager.js"

export class FactionManager {
    constructor(ns, messenger) {
        this.messenger = messenger
        this.finished = false;
        this.join_criminal_orgs = true;
        this.pursue_goal = false;
        this.default_timeout = 180
    }

    init(ns) {
        this.init_faction_data(ns);
        this.handle_additional_factions(ns);
        this.handle_city_factions(ns);
        this.get_next_faction(ns)
    }

    run(ns) {
        if (!this.finished) {
            this.handle_current_faction(ns)
            this.join_factions(ns);
            this.display_current_target(ns)
        }
    }

    finish(ns) {
        ns.print(`All eligible factions joined. Exiting & running AugManager to set faction rep goals.`)
        ns.run(`/src/scriptlauncher.js`, 1, `/src/augmanager.js`, `check`)
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
    }

    handle_additional_factions(ns) {
        if (this.join_criminal_orgs) {
            let criminal_data = [{
                faction: 'Slum Snakes',
                location: 'none',
                script: '/utils/do_crime.js',
                requirements: [
                    { type: 'cash', amount: 1000000 },
                    { type: 'karma', amount: -9 }
                ]
            }, {
                faction: 'Tetrads',
                location: 'Chongqing',
                script: '/utils/do_crime.js',
                requirements: [
                    { type: 'combat', amount: 75 },
                    { type: 'karma', amount: -18 }
                ]
            }, {
                faction: 'The Dark Army',
                location: 'Chongqing',
                script: '/utils/do_crime.js',
                requirements: [
                    { type: 'hacking', amount: 300 },
                    { type: 'combat', amount: 300 },
                    { type: 'karma', amount: -45 }
                ]
            }, {
                faction: 'The Syndicate',
                location: 'Sector-12',
                script: '/utils/do_crime.js',
                requirements: [
                    { type: 'hacking', amount: 200 },
                    { type: 'combat', amount: 200 },
                    { type: 'cash', amount: 10000000 },
                    { type: 'karma', amount: -95 }
                ]
            }]

            this.factions_to_join = [...this.factions_to_join, ...criminal_data]
        }

        /* inactive
        {
                faction: 'Speakers for the Dead',
                location: 'none',
                script: '/utils/do_crime.js',
                requirements: [
                    { type: 'hacking', amount: 100 },
                    { type: 'combat', amount: 300 },
                    { type: 'karma', amount: -45 }
                ]
            }, */
    }

    handle_current_faction(ns) {
        if (this.current_timeout <= 0) {
            ns.print(`Unable to join ${this.next_faction.faction} at this time, timed out while waiting for faction.`)
            this.get_next_faction(ns)
        } else {
            this.check_eligibility(ns);
            if (this.pursue_goal) {
                this.handle_current_actions(ns);
            }
            this.current_timeout--
        }
    }

    handle_current_actions(ns) {
        if (this.next_faction.script && !ns.isRunning(this.next_faction.script, 'home')) {
            ns.print(`Launching ${this.next_faction.script} for faction ${this.next_faction.faction}`)
            ns.run('/src/scriptlauncher.js', 1, this.next_faction.script)
        }
        // TODO: Handle stat gains
    }

    finish_current_script(ns) {
        if (this.next_faction.script && ns.isRunning(this.next_faction.script, 'home')) {
            ns.print(`Killing ${this.next_faction.script} for faction ${this.next_faction.faction}`)
            ns.kill(this.next_faction.script, 'home', '')
        }
    }

    check_eligibility(ns) {
        let completed = true;
        let reason = ''
        let result
        for (const requirement of this.next_faction.requirements) {
            switch (requirement.type) {
                case 'cash':
                    result = ns.getServerMoneyAvailable('home')
                    if (result < requirement.amount) {
                        completed = false;
                        reason += `Insufficient ${requirement.type}: ${Utils.pretty_num(requirement.amount)}, current: ${Utils.pretty_num(result)}\n`
                    }
                    break;
                case 'hacking':
                    result = ns.getPlayer().hacking
                    if (result < requirement.amount) {
                        completed = false;
                        reason += `Insufficient ${requirement.type}: ${Utils.pretty_num(requirement.amount)}, current: ${Utils.pretty_num(result)}\n`
                    }
                    break;
                case 'karma':
                    result = ns.heart.break()
                    if (result > requirement.amount) {
                        completed = false;
                        reason += `Insufficient ${requirement.type}: ${Utils.pretty_num(requirement.amount)}, current: ${Utils.pretty_num(result)}\n`
                    }
                    break;
                case 'combat':
                    for (const stat of Utils.combat_stats) {
                        result = ns.getPlayer()[stat]
                        if (result < requirement.amount) {
                            completed = false;
                            reason += `Insufficient ${requirement.type}: ${Utils.pretty_num(requirement.amount)}, current: ${Utils.pretty_num(result)}\n`
                        }
                    }
                    break;
                default:
                    ns.tprint(`ERROR: requirement type not recognized`);
                    break;
            }
        }
        if (completed) {
            this.finish_current_script(ns)
            this.messenger.add_message('FactionManager faction ready to join', `Requirements for joining ${this.next_faction.faction} met. Traveling to ${this.next_faction.location}`);
            this.join_next_faction(ns);
        } else {
            ns.print(`Unable to join ${this.next_faction.faction} at this time due to the following reasons:\n${reason}`)
            this.get_next_faction(ns)
        }
    }

    get_next_faction(ns) {
        while (this.factions_to_join.length > 0) {
            this.next_faction = this.factions_to_join.shift()
            if (!ns.getPlayer().factions.includes(this.next_faction.faction)) {
                ns.print(`Next targeted faction: ${this.next_faction.faction}`)
                this.current_timeout = this.default_timeout
                return
            }
        }
        this.finished = true;
    }

    join_next_faction(ns) {
        let result = 'none'
        if (this.next_faction.location != 'none') {
            result = PlayerHelper.travel_to(ns, this.next_faction.location);
        }
        if (result == this.next_faction.location) {
            if (ns.getPlayer().factions.includes(this.next_faction.faction)) {
                ns.print(`Faction ${this.next_faction.faction} joined! Moving to next faction target.`)
                this.get_next_faction(ns)
            }
        } else {
            ns.print(`WARN: Could not travel to ${this.next_faction.location}`)
        }
    }

    display_current_target(ns) {
        if (this.finished) return
        let message = ` Currently targeted faction: ${this.next_faction.faction}   Location: ${this.next_faction.location}\n`
        message += `  Requirements:\n`
        for (const requirement of this.next_faction.requirements) {
            message += `    Type: ${requirement.type}   Amount: ${Utils.pretty_num(requirement.amount)}\n`
        }
        this.messenger.add_message(`FactionManager update`, message)
    }

    join_factions(ns) {
        if (!this.next_faction) return
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
        let selected_city = 'Aevum'
        for (const city of Utils.cities) {
            if (AugHelper.city_faction_has_unpurchased_augs(ns, city)) {
                selected_city = city
                break;
            }
        }
        ns.print(`Next city faction to join: ${selected_city}`)

        let city_faction = {
            faction: selected_city,
            location: selected_city,
            requirements: [
                { type: 'cash', amount: FactionHelper.get_city_faction_required_cash(selected_city) }
            ]
        }
        this.factions_to_join.push(city_faction)
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
    faction_manager.finish(ns)
}

export default FactionManager;